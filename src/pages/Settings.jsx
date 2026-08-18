import { useState, useEffect } from 'react';
import { getSettings, saveSettings } from '../utils/storage';
import { createPinHash, isPinValid, isLockEnabled } from '../utils/security';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/ui/Modal';
import { Settings as SettingsIcon, User, Palette, Shield, Lock, Info, Sun, Moon, Monitor, MessageSquare, Image as ImageIcon, Trash2, CalendarDays } from 'lucide-react';

export default function Settings() {
  const { theme, setTheme, profileName, setProfileName, addToast, deviceProfile, setDeviceProfile: setAppDeviceProfile, setViewFilter } = useApp();
  const [name, setName] = useState(profileName);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [lockEnabled, setLockEnabled] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [step, setStep] = useState('create');
  const [smsTrackingEnabled, setSmsTrackingEnabled] = useState(false);
  const [localDeviceProfile, setLocalDeviceProfile] = useState(deviceProfile || 'Muthu');
  const [lockScreenImage, setLockScreenImage] = useState(null);
  const [reviewMeetingDate, setReviewMeetingDate] = useState('1');

  useEffect(() => {
    const settings = getSettings();
    setLockEnabled(isLockEnabled());
    setSmsTrackingEnabled(!!settings.smsTrackingEnabled);
    if (settings.deviceProfile) setLocalDeviceProfile(settings.deviceProfile);
    if (settings.lockScreenImage) setLockScreenImage(settings.lockScreenImage);
    if (settings.reviewMeetingDate) setReviewMeetingDate(settings.reviewMeetingDate);
  }, []);

  function handleNameSave() {
    setProfileName(name.trim());
    addToast('Profile name updated');
  }

  async function handlePinSubmit() {
    if (step === 'create') {
      if (!isPinValid(pin)) {
        setPinError('PIN must be 4-6 digits');
        return;
      }
      setStep('confirm');
      setPinError('');
      return;
    }

    if (pin !== confirmPin) {
      setPinError('PINs do not match');
      setConfirmPin('');
      return;
    }

    const { salt, hash } = await createPinHash(pin);
    saveSettings({ lockEnabled: true, pinHash: hash, pinSalt: salt, pinLength: pin.length });
    setLockEnabled(true);
    setShowPinSetup(false);
    setPin('');
    setConfirmPin('');
    setStep('create');
    setPinError('');
    addToast('App lock enabled');
  }

  function handleDisableLock() {
    saveSettings({ lockEnabled: false, pinHash: null, pinSalt: null });
    setLockEnabled(false);
    addToast('App lock disabled');
  }

  function resetPinForm() {
    setShowPinSetup(false);
    setPin('');
    setConfirmPin('');
    setStep('create');
    setPinError('');
  }

  function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setLockScreenImage(dataUrl);
        const settings = getSettings();
        saveSettings({ ...settings, lockScreenImage: dataUrl });
        addToast('Lock screen photo updated');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveImage() {
    setLockScreenImage(null);
    const settings = getSettings();
    saveSettings({ ...settings, lockScreenImage: null });
    addToast('Lock screen photo removed');
  }

  const themes = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Customize your experience</p>
      </div>

      {/* Profile */}
      <div className="card mb-4">
        <h2 className="flex items-center gap-2 section-title">
          <User className="w-4 h-4 text-brand-500" /> Profile
        </h2>
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-base flex-1"
            placeholder="Your name"
          />
          <button onClick={handleNameSave} className="btn-primary">Save</button>
        </div>
        
        <div className="mt-4 border-t border-ink-100 dark:border-ink-700 pt-4">
          <h3 className="text-sm font-semibold text-ink-600 dark:text-cream-50 mb-2">Device Owner</h3>
          <p className="text-xs text-ink-400 dark:text-ink-300 mb-3">Select who owns this phone. Any transaction added from this phone will be tagged with this name.</p>
          <div className="flex bg-ink-50 dark:bg-ink-800 p-1 rounded-lg">
            {['Muthu', 'Abi'].map((p) => (
              <button
                key={p}
                onClick={() => {
                  setLocalDeviceProfile(p);
                  saveSettings({ deviceProfile: p });
                  setAppDeviceProfile(p);
                  setViewFilter(p); // Auto-switch view to your own profile
                  addToast(`Device owner set to ${p}`);
                }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  localDeviceProfile === p
                    ? 'bg-white dark:bg-ink-600 shadow-sm text-brand-600 dark:text-brand-400'
                    : 'text-ink-400 dark:text-ink-300 hover:text-ink dark:hover:text-cream-50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lock Screen Customization */}
      <div className="card mb-4">
        <h2 className="flex items-center gap-2 section-title">
          <ImageIcon className="w-4 h-4 text-brand-500" /> Lock Screen Photo
        </h2>
        <div className="space-y-3">
          <p className="text-xs text-ink-400 dark:text-ink-300">Personalize your app lock screen with a couple's photo or family picture.</p>
          {lockScreenImage ? (
            <div className="relative w-full h-40 rounded-xl overflow-hidden shadow-sm">
              <img src={lockScreenImage} alt="Lock Screen" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <button onClick={handleRemoveImage} className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full h-32 border-2 border-dashed border-ink-200 dark:border-ink-700 rounded-xl flex flex-col items-center justify-center text-ink-300 dark:text-ink-400 relative">
              <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
              <span className="text-sm font-medium">Tap to select photo</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </div>
          )}
        </div>
      </div>

      {/* Theme */}
      <div className="card mb-4">
        <h2 className="flex items-center gap-2 section-title">
          <Palette className="w-4 h-4 text-brand-500" /> Theme
        </h2>
        <div className="flex gap-2">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
                theme === t.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-cream-200 dark:bg-ink-600 text-ink-400 dark:text-ink-200 hover:bg-cream-300 dark:hover:bg-ink-500'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="card mb-4">
        <h2 className="flex items-center gap-2 section-title">
          <Shield className="w-4 h-4 text-brand-500" /> Security
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink dark:text-cream-50">App Lock</p>
              <p className="text-xs text-ink-300 dark:text-ink-200">Require PIN to open the app</p>
            </div>
            {lockEnabled ? (
              <div className="flex items-center gap-2">
                <span className="badge badge-green"><Lock className="w-3 h-3 mr-0.5" />Enabled</span>
                <button onClick={handleDisableLock} className="btn-secondary text-xs">Disable</button>
                <button onClick={() => setShowPinSetup(true)} className="btn-secondary text-xs">Change PIN</button>
              </div>
            ) : (
              <button onClick={() => setShowPinSetup(true)} className="btn-primary text-xs">Enable</button>
            )}
          </div>
        </div>
      </div>

      {/* Automation & Reminders */}
      <div className="card mb-4">
        <h2 className="flex items-center gap-2 section-title">
          <MessageSquare className="w-4 h-4 text-brand-500" /> Automation & Reminders
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink dark:text-cream-50">Automated SMS Tracking</p>
              <p className="text-xs text-ink-300 dark:text-ink-200">Automatically add expenses from bank SMS</p>
            </div>
            <button
              onClick={() => {
                const newState = !smsTrackingEnabled;
                setSmsTrackingEnabled(newState);
                const settings = getSettings();
                saveSettings({ ...settings, smsTrackingEnabled: newState });
                addToast(newState ? 'SMS Tracking Enabled' : 'SMS Tracking Disabled');
              }}
              className={`w-11 h-6 rounded-full relative transition-colors duration-200 ${
                smsTrackingEnabled ? 'bg-brand-500' : 'bg-ink-300 dark:bg-ink-600'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-200 ${
                  smsTrackingEnabled ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
          
          <div className="pt-3 border-t border-ink-100 dark:border-ink-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink dark:text-cream-50 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-brand-500" /> Monthly Review Date
                </p>
                <p className="text-xs text-ink-300 dark:text-ink-200">Set a date for your monthly financial review</p>
              </div>
              <select
                value={reviewMeetingDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setReviewMeetingDate(val);
                  const settings = getSettings();
                  saveSettings({ ...settings, reviewMeetingDate: val });
                  addToast('Review meeting date saved');
                }}
                className="input-base py-1.5 px-3 text-sm w-20 text-center"
              >
                {Array.from({ length: 28 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Currency */}
      <div className="card mb-4">
        <h2 className="flex items-center gap-2 section-title">
          <span className="text-brand-500 font-mono font-bold">₹</span> Currency
        </h2>
        <div className="flex items-center gap-3 py-2">
          <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
            <span className="text-brand-600 font-mono font-bold text-lg">₹</span>
          </div>
          <div>
            <p className="text-sm font-medium text-ink dark:text-cream-50">Indian Rupee (INR)</p>
            <p className="text-xs text-ink-300 dark:text-ink-200">Indian number formatting (lakhs/crores)</p>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="card">
        <h2 className="flex items-center gap-2 section-title">
          <Info className="w-4 h-4 text-brand-500" /> About
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-300 dark:text-ink-200">App Name</span>
            <span className="font-medium text-ink dark:text-cream-50">Muthu</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-300 dark:text-ink-200">Version</span>
            <span className="font-medium text-ink dark:text-cream-50">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-300 dark:text-ink-200">Data Storage</span>
            <span className="font-medium text-ink dark:text-cream-50">Cloud Sync (Online)</span>
          </div>
          <p className="text-xs text-ink-300 dark:text-ink-200 pt-2">
            Muthu is a real-time synced personal finance app. Your data is synced securely across family devices.
          </p>
        </div>
      </div>

      {/* PIN Setup Modal */}
      <Modal isOpen={showPinSetup} onClose={resetPinForm} title={step === 'create' ? 'Create PIN' : 'Confirm PIN'}>
        <div className="space-y-4">
          <p className="text-sm text-ink-300 dark:text-ink-200">
            {step === 'create' ? 'Enter a 4-6 digit PIN to lock the app.' : 'Re-enter your PIN to confirm.'}
          </p>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={step === 'create' ? pin : confirmPin}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              if (step === 'create') setPin(val);
              else setConfirmPin(val);
              setPinError('');
            }}
            className="input-base text-center text-2xl tracking-[0.5em] font-mono"
            placeholder="• • • •"
            autoFocus
          />
          {pinError && <p className="text-red-500 text-xs text-center">{pinError}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={resetPinForm} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handlePinSubmit} className="btn-primary flex-1">
              {step === 'create' ? 'Next' : 'Set PIN'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
