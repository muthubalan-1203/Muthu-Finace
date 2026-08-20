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
import Loans from './pages/Loans';
import Reports from './pages/Reports';
import Calendar from './pages/Calendar';
import Settings from './pages/Settings';
import Backup from './pages/Backup';
import { requestNotificationPermission } from './utils/notifications';

export default function App() {
  const [pendingBundle, setPendingBundle] = useState(null);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Request local notification permissions on app startup
    requestNotificationPermission();

    async function checkOTA() {
      if (!Capacitor.isNativePlatform()) return;
      
      try {
        await CapacitorUpdater.notifyAppReady();
      } catch (err) {
        console.error('Failed to notify app ready:', err);
      }
      
      try {
        const FIREBASE_URL = 'https://muthu-abi-e3b3d.web.app';
        const res = await fetch(`${FIREBASE_URL}/version.json?t=${Date.now()}`);
        const remoteData = await res.json();

        const localRes = await fetch('./version.json');
        const localData = await localRes.json();

        if (remoteData.version > localData.version) {
          console.log(`Update available: ${localData.version} -> ${remoteData.version}`);
          const bundle = await CapacitorUpdater.download({
            url: `${FIREBASE_URL}/dist.zip`,
            version: String(remoteData.version),
          });
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

      {/* ── PREMIUM OTA UPDATE BANNER ── */}
      {pendingBundle && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            width: '90%',
            maxWidth: '400px',
            background: 'rgba(30, 41, 59, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderRadius: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #6366f1, #a855f7)', 
              padding: '10px', 
              borderRadius: '16px' 
            }}>
              <span style={{ fontSize: 20 }}>🚀</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                {isInstalling ? 'Installing...' : 'New Update Ready'}
              </span>
              <span style={{ fontSize: 12, color: '#94a3b8', marginTop: '2px' }}>
                {isInstalling ? 'Please wait a moment' : 'Tap to install features'}
              </span>
            </div>
          </div>
          {!isInstalling && (
            <button
              onClick={installUpdate}
              style={{
                background: '#fff',
                color: '#4f46e5',
                border: 'none',
                borderRadius: '12px',
                padding: '8px 16px',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Restart
            </button>
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
            <Route path="/loans" element={<Loans />} />
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
