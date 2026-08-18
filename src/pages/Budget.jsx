import { useState, useMemo } from 'react';
import { getAll, getItemsForMonth, addItem, updateItem, deleteItem } from '../utils/storage';
import { formatINR, getCurrentMonthYear } from '../utils/formatters';
import { useApp } from '../contexts/AppContext';
import MonthPicker from '../components/ui/MonthPicker';
import Modal, { ConfirmModal } from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { TrendingUp, Plus, Edit3, Trash2 } from 'lucide-react';

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Education', 'Utilities', 'Rent', 'Insurance', 'Travel', 'Groceries', 'Personal Care', 'Other'];

export default function Budget() {
  const { year: curYear, month: curMonth } = getCurrentMonthYear();
  const [year, setYear] = useState(curYear);
  const [month, setMonth] = useState(curMonth);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const { addToast, refreshKey, triggerRefresh } = useApp();

  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState('');
  const [errors, setErrors] = useState({});

  const budgets = useMemo(() => getAll('budgets'), [refreshKey]);
  const expenses = useMemo(() => getItemsForMonth('expenses', year, month), [year, month, refreshKey]);

  const budgetData = useMemo(() => {
    return budgets.map((b) => {
      const spent = expenses.filter((e) => e.category === b.category).reduce((s, e) => s + Number(e.amount), 0);
      const budgetLimit = Number(b.limit);
      const pct = budgetLimit > 0 ? Math.round((spent / budgetLimit) * 100) : 0;
      let status = 'on-track';
      if (pct >= 100) status = 'over-budget';
      else if (pct >= 80) status = 'near-limit';
      return { ...b, spent, pct, status };
    });
  }, [budgets, expenses]);

  const totalBudget = budgets.reduce((s, b) => s + Number(b.limit), 0);
  const totalSpent = budgetData.reduce((s, b) => s + b.spent, 0);

  function validate() {
    const errs = {};
    if (!category) errs.category = 'Select a category';
    if (!limit || Number(limit) <= 0) errs.limit = 'Enter a valid limit';
    if (!editing && budgets.find((b) => b.category === category)) errs.category = 'Budget already exists for this category';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    if (editing) {
      updateItem('budgets', editing.id, { category, limit: Number(limit) });
      addToast('Budget updated');
    } else {
      addItem('budgets', { category, limit: Number(limit) });
      addToast('Budget added');
    }
    resetForm();
    triggerRefresh();
  }

  function resetForm() {
    setShowForm(false);
    setEditing(null);
    setCategory('');
    setLimit('');
    setErrors({});
  }

  function startEdit(b) {
    setEditing(b);
    setCategory(b.category);
    setLimit(String(b.limit));
    setShowForm(true);
  }

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="page-title">Budget</h1>
          <p className="page-subtitle">Monthly spending limits</p>
        </div>
        <div className="flex items-center gap-2">
          <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {budgets.length > 0 && (
        <div className="card mb-4 border-l-4 border-brand-500">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-xs text-ink-300 dark:text-ink-200">Total Budget</span>
              <p className="currency text-xl font-bold text-ink dark:text-cream-50">{formatINR(totalBudget)}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-ink-300 dark:text-ink-200">Total Spent</span>
              <p className={`currency text-xl font-bold ${totalSpent > totalBudget ? 'text-red-500' : 'text-ink dark:text-cream-50'}`}>{formatINR(totalSpent)}</p>
            </div>
          </div>
        </div>
      )}

      {budgetData.length === 0 ? (
        <EmptyState icon={TrendingUp} title="No budgets set" description="Create budgets for expense categories to track your spending limits."
          action={<button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Budget</button>} />
      ) : (
        <div className="space-y-3">
          {budgetData.map((b, i) => (
            <div key={b.id} className="card animate-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink dark:text-cream-50">{b.category}</span>
                  <span className={`badge ${b.status === 'over-budget' ? 'badge-red' : b.status === 'near-limit' ? 'badge-amber' : 'badge-green'}`}>
                    {b.status === 'over-budget' ? 'Over Budget' : b.status === 'near-limit' ? 'Near Limit' : 'On Track'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => startEdit(b)} className="p-2 rounded-lg hover:bg-cream-300 dark:hover:bg-ink-600 transition-colors"><Edit3 className="w-4 h-4 text-ink-300" /></button>
                  <button onClick={() => setDeleteId(b.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-4 h-4 text-red-400" /></button>
                </div>
              </div>
              <div className="h-3 rounded-full bg-cream-300 dark:bg-ink-600 overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${b.status === 'over-budget' ? 'bg-red-500' : b.status === 'near-limit' ? 'bg-amber-500' : 'bg-brand-500'}`}
                  style={{ width: `${Math.min(b.pct, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className="currency text-ink-400 dark:text-ink-200">{formatINR(b.spent)} spent</span>
                <span className="currency text-ink-400 dark:text-ink-200">{formatINR(Number(b.limit))} limit</span>
              </div>
              <p className={`text-xs font-medium mt-1 ${b.status === 'over-budget' ? 'text-red-500' : b.status === 'near-limit' ? 'text-amber-500' : 'text-brand-500'}`}>
                {b.pct}% used
              </p>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showForm} onClose={resetForm} title={editing ? 'Edit Budget' : 'Add Budget'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-base" disabled={!!editing}>
              <option value="">Select category</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Monthly Limit (₹)</label>
            <input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} className="input-base" placeholder="e.g. 5000" min="0" step="any" />
            {errors.limit && <p className="text-red-500 text-xs mt-1">{errors.limit}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={resetForm} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">{editing ? 'Update' : 'Add'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { deleteItem('budgets', deleteId); setDeleteId(null); addToast('Budget deleted'); triggerRefresh(); }}
        title="Delete Budget" message="Are you sure you want to delete this budget?" />
    </div>
  );
}
