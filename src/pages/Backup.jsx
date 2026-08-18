import { useState, useMemo, useRef } from 'react';
import { exportAllData, importAllData, clearAllData, getStorageUsage } from '../utils/storage';
import { shareFile } from '../utils/share';
import { formatBytes } from '../utils/formatters';
import { useApp } from '../contexts/AppContext';
import { ConfirmModal } from '../components/ui/Modal';
import { Database, Upload, Download, Trash2, HardDrive } from 'lucide-react';

export default function Backup() {
  const { addToast, triggerRefresh } = useApp();
  const [showWipe, setShowWipe] = useState(false);
  const fileRef = useRef(null);

  const usage = useMemo(() => getStorageUsage(), []);

  async function handleExport() {
    const data = exportAllData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const fileName = `muthu_backup_${new Date().toISOString().slice(0, 10)}.json`;
    const ok = await shareFile('Muthu Backup', blob, fileName, 'application/json');
    if (ok) addToast('Backup exported successfully');
  }

  function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data._version) {
          addToast('Invalid backup file', 'error');
          return;
        }
        importAllData(data);
        addToast('Backup restored successfully');
        triggerRefresh();
      } catch {
        addToast('Failed to parse backup file', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleWipe() {
    clearAllData();
    addToast('All data cleared');
    triggerRefresh();
    window.location.reload();
  }

  const entities = [
    { key: 'salary', label: 'Salary', icon: '💰' },
    { key: 'income', label: 'Income', icon: '📥' },
    { key: 'expenses', label: 'Expenses', icon: '📤' },
    { key: 'budgets', label: 'Budgets', icon: '📊' },
    { key: 'savings', label: 'Savings', icon: '🏦' },
    { key: 'bills', label: 'Bills', icon: '📋' },
    { key: 'goals', label: 'Goals', icon: '🎯' },
    { key: 'plans', label: 'Plans', icon: '📝' },
    { key: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="page-title">Backup & Restore</h1>
        <p className="page-subtitle">Export, import, and manage your data</p>
      </div>

      {/* Export / Import */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Download className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-medium text-ink dark:text-cream-50">Export Data</h3>
              <p className="text-xs text-ink-300 dark:text-ink-200">Download all data as JSON</p>
            </div>
          </div>
          <button onClick={handleExport} className="btn-primary w-full">
            <Download className="w-4 h-4" /> Export Backup
          </button>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Upload className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-ink dark:text-cream-50">Restore Data</h3>
              <p className="text-xs text-ink-300 dark:text-ink-200">Import from a JSON backup</p>
            </div>
          </div>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="btn-secondary w-full">
            <Upload className="w-4 h-4" /> Import Backup
          </button>
        </div>
      </div>

      {/* Storage Usage */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <HardDrive className="w-4 h-4 text-brand-500" />
          <h2 className="section-title mb-0">Storage Usage</h2>
          <span className="ml-auto badge badge-gray">{formatBytes(usage._total)}</span>
        </div>
        <div className="space-y-2">
          {entities.map((e) => (
            <div key={e.key} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm">{e.icon}</span>
                <span className="text-sm text-ink dark:text-cream-50">{e.label}</span>
              </div>
              <span className="text-xs text-ink-300 dark:text-ink-200 font-mono">{formatBytes(usage[e.key] || 0)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 border-t border-ink-50 dark:border-ink-600 font-semibold">
            <span className="text-sm text-ink dark:text-cream-50">Total</span>
            <span className="text-sm text-ink dark:text-cream-50 font-mono">{formatBytes(usage._total)}</span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card border border-red-200 dark:border-red-900/50">
        <h2 className="flex items-center gap-2 text-red-500 font-display font-semibold text-lg mb-2">
          <Trash2 className="w-4 h-4" /> Danger Zone
        </h2>
        <p className="text-sm text-ink-300 dark:text-ink-200 mb-4">
          Permanently delete all data. This action cannot be undone.
        </p>
        <button onClick={() => setShowWipe(true)} className="btn-danger">
          <Trash2 className="w-4 h-4" /> Wipe All Data
        </button>
      </div>

      <ConfirmModal
        isOpen={showWipe}
        onClose={() => setShowWipe(false)}
        onConfirm={handleWipe}
        title="Wipe All Data?"
        message="This will permanently delete ALL your financial data including salary, income, expenses, budgets, savings, bills, goals, notes, and settings. This action cannot be undone."
        confirmText="Wipe Everything"
      />
    </div>
  );
}
