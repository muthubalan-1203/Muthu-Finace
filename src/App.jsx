import { useEffect } from 'react';
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
  useEffect(() => {
    async function checkOTA() {
      if (!Capacitor.isNativePlatform()) return;
      try {
        // IMPORTANT: Replace YOUR_USERNAME and YOUR_REPO with actual GitHub details
        const GITHUB_USERNAME = 'muthubalan-1203';
        const GITHUB_REPO = 'Muthu-Finace';
        
        // Fetch remote version
        const res = await fetch(`https://raw.githubusercontent.com/${GITHUB_USERNAME}/${GITHUB_REPO}/main/public/version.json?t=${Date.now()}`);
        const remoteData = await res.json();
        
        // Fetch local version
        const localRes = await fetch('./version.json');
        const localData = await localRes.json();

        if (remoteData.version > localData.version) {
          console.log(`Update available: ${localData.version} -> ${remoteData.version}`);
          const zipUrl = `https://github.com/${GITHUB_USERNAME}/${GITHUB_REPO}/raw/main/dist.zip`;
          
          await CapacitorUpdater.download({
            url: zipUrl,
            version: String(remoteData.version)
          });
          
          await CapacitorUpdater.set({ id: String(remoteData.version) });
        }
      } catch (e) {
        console.error('OTA Update check failed:', e);
      }
    }
    checkOTA();
  }, []);

  return (
    <AppProvider>
      <LockScreen />
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
