import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

// CRITICAL: Tell the updater the app loaded successfully.
// Without this, the plugin auto-rolls back any OTA update on next launch.
CapacitorUpdater.notifyAppReady();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
