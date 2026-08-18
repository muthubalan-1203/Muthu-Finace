import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { getSettings, saveSettings } from '../utils/storage';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [theme, setThemeState] = useState('system');
  const [profileName, setProfileNameState] = useState('');
  const [toasts, setToasts] = useState([]);
  const [isLocked, setIsLocked] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewFilter, setViewFilter] = useState(() => {
    const settings = getSettings();
    return settings.deviceProfile || 'Muthu';
  });
  const [deviceProfile, setDeviceProfile] = useState(() => {
    const settings = getSettings();
    return settings.deviceProfile || 'Muthu';
  });

  useEffect(() => {
    const settings = getSettings();
    if (settings.theme) setThemeState(settings.theme);
    if (settings.profileName) setProfileNameState(settings.profileName);
    if (settings.deviceProfile) setDeviceProfile(settings.deviceProfile);

    const lockEnabled = settings.lockEnabled && settings.pinHash && settings.pinSalt;
    setIsLocked(!!lockEnabled);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
      const handler = (e) => root.classList.toggle('dark', e.matches);
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme]);

  // Re-lock on app resume from background (Capacitor)
  useEffect(() => {
    let backgroundTime = null;
    const GRACE_PERIOD = 30000; // 30 seconds

    async function setupAppListener() {
      try {
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
          const { App } = await import('@capacitor/app');
          
          async function checkSMS() {
            try {
              const settings = getSettings();
              if (!settings.smsTrackingEnabled) return;

              const { MessageReader } = await import('@solimanware/capacitor-sms-reader');
              const perm = await MessageReader.checkPermissions();
              if (perm.messages !== 'granted') {
                const req = await MessageReader.requestPermissions();
                if (req.messages !== 'granted') return;
              }

              const lastScanRaw = localStorage.getItem('muthu:lastSmsScan');
              const minDate = lastScanRaw ? parseInt(lastScanRaw, 10) : Date.now() - (2 * 24 * 60 * 60 * 1000);
              
              const result = await MessageReader.getMessages({
                minDate,
                maxDate: Date.now(),
              });
              
              if (result.messages && result.messages.length > 0) {
                const { parseSmsList } = await import('../utils/smsParser');
                const count = await parseSmsList(result.messages);
                if (count > 0) {
                  addToast(`${count} transaction(s) auto-added from SMS!`);
                  setRefreshKey((k) => k + 1);
                }
              }
              
              localStorage.setItem('muthu:lastSmsScan', Date.now().toString());
            } catch (e) {
              console.log('SMS check failed', e);
            }
          }

          // Check on initial load
          checkSMS();

          App.addListener('appStateChange', ({ isActive }) => {
            const settings = getSettings();

            if (!isActive) {
              backgroundTime = Date.now();
            } else {
              // App resumed
              checkSMS();
              if (backgroundTime) {
                const elapsed = Date.now() - backgroundTime;
                if (elapsed > GRACE_PERIOD && settings.lockEnabled) {
                  setIsLocked(true);
                }
                backgroundTime = null;
              }
            }
          });
        }
      } catch (e) {
        // Not on native platform
      }
    }
    setupAppListener();
  }, []);

  // Firebase Two-Way Sync Listener
  useEffect(() => {
    async function startSync() {
      try {
        const { db, collection, onSnapshot } = await import('../utils/firebase');
        const { getAll, setAll } = await import('../utils/storage');

        const unsub = onSnapshot(
          collection(db, 'users/muthu-abi/transactions'),
          { includeMetadataChanges: true }, // CRITICAL: needed to detect local vs remote changes
          (snapshot) => {
            let changed = false;
            snapshot.docChanges({ includeMetadataChanges: true }).forEach((change) => {
              // Skip changes that originated from THIS device (still pending upload to server)
              if (change.doc.metadata.hasPendingWrites) return;

              const data = change.doc.data();
              const entity = data._entity;
              if (!entity) return;

              const items = getAll(entity);
              if (change.type === 'added' || change.type === 'modified') {
                const idx = items.findIndex((i) => i.id === data.id);
                const cleanData = { ...data };
                delete cleanData._entity;

                if (idx === -1) {
                  items.push(cleanData);
                } else {
                  // Only update if remote version is newer
                  const existingUpdated = items[idx].updatedAt || items[idx].createdAt || '';
                  const remoteUpdated = cleanData.updatedAt || cleanData.createdAt || '';
                  if (remoteUpdated >= existingUpdated) {
                    items[idx] = cleanData;
                  } else {
                    return; // Skip - local is newer
                  }
                }
                setAll(entity, items);
                changed = true;
              }
              if (change.type === 'removed') {
                const filtered = items.filter((i) => i.id !== data.id);
                if (filtered.length !== items.length) {
                  setAll(entity, filtered);
                  changed = true;
                }
              }
            });

            if (changed) {
              setRefreshKey((k) => k + 1);
            }
          }
        );
        return unsub;
      } catch (e) {
        console.warn('Firebase sync not available or failed', e);
      }
    }
    const syncPromise = startSync();
    return () => {
      syncPromise.then(unsub => unsub && unsub());
    };
  }, []);

  const setTheme = useCallback((t) => {
    setThemeState(t);
    saveSettings({ theme: t });
  }, []);

  const setProfileName = useCallback((name) => {
    setProfileNameState(name);
    saveSettings({ profileName: name });
  }, []);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const unlock = useCallback(() => setIsLocked(false), []);
  const lock = useCallback(() => setIsLocked(true), []);
  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // canEdit: true only if viewing YOUR OWN profile
  // (Muthu can edit when viewFilter=Muthu, Abi when viewFilter=Abi)
  // Family view = read-only for everyone
  const canEdit = useMemo(() => viewFilter === deviceProfile, [viewFilter, deviceProfile]);

  return (
    <AppContext.Provider
      value={{
        theme,
        setTheme,
        profileName,
        setProfileName,
        toasts,
        addToast,
        isLocked,
        unlock,
        lock,
        refreshKey,
        triggerRefresh,
        viewFilter,
        setViewFilter,
        deviceProfile,
        setDeviceProfile,
        canEdit,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
