import { useState, useMemo } from 'react';
import { getAll, addItem, updateItem, deleteItem, filterByProfile } from '../utils/storage';
import { formatINR, formatDate } from '../utils/formatters';
import { useApp } from '../contexts/AppContext';
import Modal, { ConfirmModal } from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { PiggyBank, Plus, Edit3, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function Savings() {
  const { addToast, refreshKey, triggerRefresh, viewFilter, canEdit } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const [type, setType] = useState('deposit');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});

  const items = useMemo(
    () => filterByProfile(getAll('savings'), viewFilter).sort((a, b) => new Date(b.date) - new Date(a.date)),
    [refreshKey, viewFilter]
  );

  const totalSavings = items.reduce((s, i) => {
    const amt = Number(i.amount);
    return i.type === 'deposit' ? s + amt : s - amt;
  }, 0);

  const totalDeposits = items.filter((i) => i.type === 'deposit').reduce((s, i) => s + Number(i.amount), 0);
  const totalWithdrawals = items.filter((i) => i.type === 'withdrawal').reduce((s, i) => s + Number(i.amount), 0);

  function validate() {
    const errs = {};
    if (!amount || Number(amount) <= 0) errs.amount = 'Enter a valid amount';
    if (!date) errs.date = 'Date is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!canEdit) return;
    if (!validate()) return;
    const data = { type, amount: Number(amount), date, note: note.trim() };
    if (editing) {
      updateItem('savings', editing.id, data);
      addToast('Savings entry updated');
    } else {
      addItem('savings', data);
      addToast(type === 'deposit' ? 'Deposit added' : 'Withdrawal added');
    }
    resetForm();
    triggerRefresh();
  }

  function resetForm() {
    setShowForm(false);
    setEditing(null);
    setType('deposit');
    setAmount('');
    setDate('');
    setNote('');
    setErrors({});
  }

  function startEdit(item) {
    setEditing(item);
    setType(item.type);
    setAmount(String(item.amount));
    setDate(item.date);
    setNote(item.note || '');
    setShowForm(true);
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Savings</h1>
          <p className="page-subtitle">Your savings ledger</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="card border-l-4 border-brand-500">
          <span className="text-xs text-ink-300 dark:text-ink-200">Total Savings</span>
          <p className={`currency text-xl font-bold ${totalSavings < 0 ? 'text-red-500' : 'text-ink dark:text-cream-50'}`}>{formatINR(totalSavings)}</p>
        </div>
        <div className="card">
          <span className="text-xs text-ink-300 dark:text-ink-200">Total Deposits</span>
          <p className="currency text-lg font-semibold text-emerald-600">{formatINR(totalDeposits)}</p>
        </div>
        <div className="card">
          <span className="text-xs text-ink-300 dark:text-ink-200">Total Withdrawals</span>
          <p className="currency text-lg font-semibold text-red-500">{formatINR(totalWithdrawals)}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={PiggyBank} title="No savings entries" description="Start building your savings by adding deposits."
          action={canEdit ? <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Entry</button> : null} />
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={item.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.type === 'deposit' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                  {item.type === 'deposit' ? <ArrowDownRight className="w-4 h-4 text-emerald-600" /> : <ArrowUpRight className="w-4 h-4 text-red-500" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink dark:text-cream-50 capitalize">{item.type}</p>
                    {viewFilter === 'Family' && (
                      <span className="badge badge-gray">{item.addedBy || 'Muthu'}</span>
                    )}
                    <span className={`badge ${item.type === 'deposit' ? 'badge-green' : 'badge-red'}`}>{item.type}</span>
                  </div>
                  <p className="text-xs text-ink-300 dark:text-ink-200 truncate">{formatDate(item.date)}{item.note && ` · ${item.note}`}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <p className={`currency font-semibold ${item.type === 'deposit' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {item.type === 'deposit' ? '+' : '-'}{formatINR(item.amount)}
                </p>
                {canEdit && (
                  <>
                    <button onClick={() => startEdit(item)} className="p-2 rounded-lg hover:bg-cream-300 dark:hover:bg-ink-600 transition-colors"><Edit3 className="w-4 h-4 text-ink-300" /></button>
                    <button onClick={() => setDeleteId(item.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-4 h-4 text-red-400" /></button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showForm} onClose={resetForm} title={editing ? 'Edit Entry' : 'Add Savings Entry'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Type</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setType('deposit')} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${type === 'deposit' ? 'bg-emerald-600 text-white' : 'bg-cream-200 dark:bg-ink-600 text-ink-400 dark:text-ink-200'}`}>
                Deposit
              </button>
              <button type="button" onClick={() => setType('withdrawal')} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${type === 'withdrawal' ? 'bg-red-600 text-white' : 'bg-cream-200 dark:bg-ink-600 text-ink-400 dark:text-ink-200'}`}>
                Withdrawal
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Amount (₹)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="input-base" placeholder="0" min="0" step="any" />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-base" />
            {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Note (optional)</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="input-base" placeholder="e.g. Emergency fund" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={resetForm} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">{editing ? 'Update' : 'Add'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { deleteItem('savings', deleteId); setDeleteId(null); addToast('Entry deleted'); triggerRefresh(); }}
        title="Delete Entry" message="Are you sure you want to delete this savings entry?" />
    </div>
  );
}
