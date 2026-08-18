import { useState, useMemo } from 'react';
import { getAll, addItem, updateItem, deleteItem, getSettings } from '../utils/storage';
import { formatINR, formatDate } from '../utils/formatters';
import { useApp } from '../contexts/AppContext';
import Modal, { ConfirmModal } from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { Wallet, Plus, Edit3, Trash2, ArrowRight } from 'lucide-react';

export default function Salary() {
  const { addToast, refreshKey, triggerRefresh, viewFilter, canEdit } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [amount, setAmount] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [salaryDay, setSalaryDay] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});

  const salaries = useMemo(() => {
    const all = getAll('salary').sort((a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom));
    // In Family view show all; otherwise filter by profile
    if (!viewFilter || viewFilter === 'Family') return all;
    return all.filter(s => (s.addedBy || 'Muthu') === viewFilter);
  }, [refreshKey, viewFilter]);

  // Device profile for tagging new entries
  const deviceProfile = useMemo(() => getSettings().deviceProfile || 'Muthu', [refreshKey]);

  const currentSalary = salaries.length > 0 ? salaries[0] : null;

  function validate() {
    const errs = {};
    if (!amount || Number(amount) <= 0) errs.amount = 'Enter a valid positive amount';
    if (!effectiveFrom) errs.effectiveFrom = 'Select an effective date';
    if (salaryDay && (Number(salaryDay) < 1 || Number(salaryDay) > 31)) errs.salaryDay = 'Enter a valid day (1-31)';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!canEdit) return;
    if (!validate()) return;
    const data = { amount: Number(amount), effectiveFrom, salaryDay: salaryDay ? Number(salaryDay) : null, note };
    if (editing) {
      updateItem('salary', editing.id, data);
      addToast('Salary updated');
    } else {
      addItem('salary', data);
      addToast('Salary entry added');
    }
    resetForm();
    triggerRefresh();
  }

  function resetForm() {
    setShowForm(false);
    setEditing(null);
    setAmount('');
    setEffectiveFrom('');
    setSalaryDay('');
    setNote('');
    setErrors({});
  }

  function startEdit(s) {
    setEditing(s);
    setAmount(String(s.amount));
    setEffectiveFrom(s.effectiveFrom || '');
    setSalaryDay(s.salaryDay ? String(s.salaryDay) : '');
    setNote(s.note || '');
    setShowForm(true);
  }

  function handleDelete() {
    deleteItem('salary', deleteId);
    setDeleteId(null);
    addToast('Salary entry deleted');
    triggerRefresh();
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Salary</h1>
          <p className="page-subtitle">{!viewFilter || viewFilter === 'Family' ? 'Family' : viewFilter}'s salary history</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add {deviceProfile}'s Salary
          </button>
        )}
      </div>

      {currentSalary && (
        <div className="card mb-6 border-l-4 border-brand-500">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-brand-500" />
            <span className="text-xs text-ink-300 dark:text-ink-200 font-medium">Current Salary</span>
          </div>
          <p className="currency text-2xl font-bold text-ink dark:text-cream-50">{formatINR(currentSalary.amount)}</p>
          <p className="text-xs text-ink-300 dark:text-ink-200 mt-1">
            Effective from {formatDate(currentSalary.effectiveFrom)}
            {currentSalary.salaryDay && <span className="ml-2">· Salary Day: {currentSalary.salaryDay}</span>}
          </p>
        </div>
      )}

      {salaries.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No salary entries"
          description="Add your current salary to start tracking your finances."
          action={
            canEdit ? (
              <button onClick={() => setShowForm(true)} className="btn-primary">
                <Plus className="w-4 h-4" /> Add Salary
              </button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-2">
          {salaries.map((s, i) => (
            <div key={s.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="currency font-semibold text-ink dark:text-cream-50">{formatINR(s.amount)}</p>
                  {viewFilter === 'Family' && (
                    <span className="badge badge-gray">{s.addedBy || 'Muthu'}</span>
                  )}
                  {i === 0 && <span className="badge badge-green">Current</span>}
                </div>
                <p className="text-xs text-ink-300 dark:text-ink-200 mt-0.5">
                  From {formatDate(s.effectiveFrom)}
                  {s.salaryDay && (
                    <span className="text-brand-600 dark:text-brand-400"> · Salary Day: {s.salaryDay}</span>
                  )}
                  {s.note && ` · ${s.note}`}
                </p>
              </div>
              {canEdit && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => startEdit(s)} className="p-2 rounded-lg hover:bg-cream-300 dark:hover:bg-ink-600 transition-colors">
                    <Edit3 className="w-4 h-4 text-ink-300" />
                  </button>
                  <button onClick={() => setDeleteId(s.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showForm} onClose={resetForm} title={editing ? 'Edit Salary' : 'Add Salary'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Amount (₹)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="input-base" placeholder="e.g. 50000" min="0" step="any" />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Effective From</label>
            <input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className="input-base" />
            {errors.effectiveFrom && <p className="text-red-500 text-xs mt-1">{errors.effectiveFrom}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Salary Day (Optional)</label>
            <input type="number" min="1" max="31" value={salaryDay} onChange={(e) => setSalaryDay(e.target.value)} className="input-base" placeholder="e.g. 5" />
            {errors.salaryDay && <p className="text-red-500 text-xs mt-1">{errors.salaryDay}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Note (optional)</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="input-base" placeholder="e.g. Promotion, Annual hike" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={resetForm} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">{editing ? 'Update' : 'Add'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Salary Entry"
        message="Are you sure you want to delete this salary entry? This action cannot be undone."
      />
    </div>
  );
}
