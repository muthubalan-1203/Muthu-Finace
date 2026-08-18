import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { Capacitor } from '@capacitor/core';
import Layout from './components/Layout';
import LockScreen from './components/LockScreen';
import ToastContainer from './components/ui/Toast';
import Dashboard from './pages/Dashboard';
import Salary from './pages/Salary';
import Income from './pages/Income';
import Expenses from './pages/Expenses';
import Budget from './pages/Budget';
import Savings from './pages/Savings';
import Bills from './pages/Bills';
import Goals from './pages/Goals';
import Plans from './pages/Plans';
import Reports from './pages/Reports';
import Calendar from './pages/Calendar';
import Settings from './pages/Settings';
import Backup from './pages/Backup';

export default function App() {
  // null = checking, false = no update, object = bundle ready to install
  const [pendingBundle, setPendingBundle] = useState(null);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    async function checkOTA() {
      if (!Capacitor.isNativePlatform()) return;
      try {
        const FIREBASE_URL = 'https://muthu-abi-e3b3d.web.app';
        const res = await fetch(`${FIREBASE_URL}/version.json?t=${Date.now()}`);
        const remoteData = await res.json();

        const localRes = await fetch('./version.json');
        const localData = await localRes.json();

        if (remoteData.version > localData.version) {
          console.log(`Update available: ${localData.version} -> ${remoteData.version}`);
          // Pre-download silently in the background
          const bundle = await CapacitorUpdater.download({
            url: `${FIREBASE_URL}/dist.zip`,
            version: String(remoteData.version),
          });
          // Show the banner — update is ready to install
          setPendingBundle(bundle);
        }
      } catch (e) {
        console.error('OTA Update check failed:', e);
      }
    }
    checkOTA();
  }, []);

  async function installUpdate() {
    if (!pendingBundle || isInstalling) return;
    setIsInstalling(true);
    try {
      await CapacitorUpdater.set(pendingBundle);
      CapacitorUpdater.reload();
    } catch (e) {
      console.error('Failed to install update:', e);
      setIsInstalling(false);
    }
  }

  return (
    <AppProvider>
      <LockScreen />

      {/* ── OTA Update Banner ── */}
      {pendingBundle && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            gap: 12,
            boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🚀</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {isInstalling ? 'Installing update...' : 'New update available!'}
            </span>
          </div>
          {!isInstalling && (
            <button
              onClick={installUpdate}
              style={{
                background: '#fff',
                color: '#4f46e5',
                border: 'none',
                borderRadius: 8,
                padding: '6px 14px',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Update &amp; Restart
            </button>
          )}
          {isInstalling && (
            <span style={{ fontSize: 13, opacity: 0.85 }}>Restarting...</span>
          )}
        </div>
      )}

      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/salary" element={<Salary />} />
            <Route path="/income" element={<Income />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/budget" element={<Budget />} />
            <Route path="/savings" element={<Savings />} />
            <Route path="/bills" element={<Bills />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/backup" element={<Backup />} />
          </Routes>
        </Layout>
      </HashRouter>
      <ToastContainer />
    </AppProvider>
  );
}
