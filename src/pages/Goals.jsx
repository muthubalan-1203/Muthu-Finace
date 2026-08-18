import { useState, useMemo } from 'react';
import { getAll, addItem, updateItem, deleteItem, filterByProfile } from '../utils/storage';
import { formatINR, formatDate, calcPercent } from '../utils/formatters';
import { useApp } from '../contexts/AppContext';
import Modal, { ConfirmModal } from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { Target, Plus, Edit3, Trash2, TrendingUp } from 'lucide-react';

export default function Goals() {
  const { addToast, refreshKey, triggerRefresh, viewFilter, canEdit } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [showFund, setShowFund] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [errors, setErrors] = useState({});

  const [fundAmount, setFundAmount] = useState('');
  const [fundError, setFundError] = useState('');

  const goals = useMemo(
    () => filterByProfile(getAll('goals'), viewFilter).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [refreshKey, viewFilter]
  );

  function validate() {
    const errs = {};
    if (!name.trim()) errs.name = 'Goal name is required';
    if (!targetAmount || Number(targetAmount) <= 0) errs.targetAmount = 'Enter a valid target amount';
    if (currentAmount && Number(currentAmount) < 0) errs.currentAmount = 'Amount cannot be negative';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!canEdit) return;
    if (!validate()) return;
    const data = { name: name.trim(), targetAmount: Number(targetAmount), targetDate: targetDate || null, currentAmount: Number(currentAmount || 0) };
    if (editing) {
      updateItem('goals', editing.id, data);
      addToast('Goal updated');
    } else {
      addItem('goals', data);
      addToast('Goal created');
    }
    resetForm();
    triggerRefresh();
  }

  function resetForm() {
    setShowForm(false);
    setEditing(null);
    setName('');
    setTargetAmount('');
    setTargetDate('');
    setCurrentAmount('');
    setErrors({});
  }

  function startEdit(goal) {
    setEditing(goal);
    setName(goal.name);
    setTargetAmount(String(goal.targetAmount));
    setTargetDate(goal.targetDate || '');
    setCurrentAmount(String(goal.currentAmount || 0));
    setShowForm(true);
  }

  function handleFund(e) {
    e.preventDefault();
    if (!canEdit) return;
    if (!fundAmount || Number(fundAmount) <= 0) {
      setFundError('Enter a valid amount');
      return;
    }
    const goal = showFund;
    const newAmount = (Number(goal.currentAmount) || 0) + Number(fundAmount);
    updateItem('goals', goal.id, { currentAmount: newAmount });
    addToast(`Added ${formatINR(Number(fundAmount))} to ${goal.name}`);
    setShowFund(null);
    setFundAmount('');
    setFundError('');
    triggerRefresh();
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Goals</h1>
          <p className="page-subtitle">Financial goals & progress</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add
          </button>
        )}
      </div>

      {goals.length === 0 ? (
        <EmptyState icon={Target} title="No goals yet" description="Set financial goals like saving for a car or emergency fund."
          action={canEdit ? <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> Create Goal</button> : null} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {goals.map((goal, i) => {
            const current = Number(goal.currentAmount) || 0;
            const target = Number(goal.targetAmount);
            const pct = calcPercent(current, target);
            const isComplete = current >= target;
            return (
              <div key={goal.id} className="card animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <h3 className="font-medium text-ink dark:text-cream-50 truncate">{goal.name}</h3>
                    {viewFilter === 'Family' && (
                      <span className="badge badge-gray flex-shrink-0">{goal.addedBy || 'Muthu'}</span>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <button onClick={() => startEdit(goal)} className="p-1.5 rounded-lg hover:bg-cream-300 dark:hover:bg-ink-600 transition-colors"><Edit3 className="w-3.5 h-3.5 text-ink-300" /></button>
                      <button onClick={() => setDeleteId(goal.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="currency text-ink-400 dark:text-ink-200">{formatINR(current)}</span>
                  <span className="currency text-ink-400 dark:text-ink-200">{formatINR(target)}</span>
                </div>
                <div className="h-3 rounded-full bg-cream-300 dark:bg-ink-600 overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${isComplete ? 'bg-emerald-500' : 'bg-brand-500'}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${isComplete ? 'text-emerald-500' : 'text-brand-500'}`}>
                    {isComplete ? '🎉 Goal reached!' : `${pct}% complete`}
                  </span>
                  {goal.targetDate && (
                    <span className="text-xs text-ink-300 dark:text-ink-200">Target: {formatDate(goal.targetDate)}</span>
                  )}
                </div>
                {!isComplete && canEdit && (
                  <button onClick={() => { setShowFund(goal); setFundAmount(''); setFundError(''); }} className="mt-3 w-full btn-secondary text-xs justify-center">
                    <TrendingUp className="w-3.5 h-3.5" /> Add Funds
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showForm} onClose={resetForm} title={editing ? 'Edit Goal' : 'Create Goal'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Goal Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-base" placeholder="e.g. Emergency Fund" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Target Amount (₹)</label>
            <input type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} className="input-base" placeholder="e.g. 100000" min="0" step="any" />
            {errors.targetAmount && <p className="text-red-500 text-xs mt-1">{errors.targetAmount}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Current Amount (₹)</label>
            <input type="number" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} className="input-base" placeholder="0" min="0" step="any" />
            {errors.currentAmount && <p className="text-red-500 text-xs mt-1">{errors.currentAmount}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Target Date (optional)</label>
            <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="input-base" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={resetForm} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">{editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!showFund} onClose={() => setShowFund(null)} title={`Add Funds — ${showFund?.name || ''}`}>
        <form onSubmit={handleFund} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Amount (₹)</label>
            <input type="number" value={fundAmount} onChange={(e) => { setFundAmount(e.target.value); setFundError(''); }} className="input-base" placeholder="e.g. 5000" min="0" step="any" />
            {fundError && <p className="text-red-500 text-xs mt-1">{fundError}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowFund(null)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">Add Funds</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { deleteItem('goals', deleteId); setDeleteId(null); addToast('Goal deleted'); triggerRefresh(); }}
        title="Delete Goal" message="Are you sure you want to delete this goal?" />
    </div>
  );
}
