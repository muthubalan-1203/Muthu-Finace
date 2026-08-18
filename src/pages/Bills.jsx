import { useState, useMemo, useEffect } from 'react';
import { getAll, addItem, updateItem, deleteItem, filterByProfile } from '../utils/storage';
import { formatINR, formatDate, isPastDue, getCurrentMonthYear } from '../utils/formatters';
import { shareText, isShareAvailable, formatBillShareText } from '../utils/share';
import { useApp } from '../contexts/AppContext';
import MonthPicker from '../components/ui/MonthPicker';
import SearchBar from '../components/ui/SearchBar';
import Modal, { ConfirmModal } from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { Receipt, Plus, Edit3, Trash2, Share2, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react';

export default function Bills() {
  const { year: curYear, month: curMonth } = getCurrentMonthYear();
  const [year, setYear] = useState(curYear);
  const [month, setMonth] = useState(curMonth);
  const { addToast, refreshKey, triggerRefresh, viewFilter, canEdit } = useApp();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [canShare, setCanShare] = useState(false);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [paid, setPaid] = useState(false);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => { isShareAvailable().then(setCanShare); }, []);

  const items = useMemo(() => {
    let list = getAll('bills');
    list = filterByProfile(list, viewFilter);
    // Filter by selected month/year based on dueDate
    list = list.filter(b => {
      if (!b.dueDate) return true;
      const d = new Date(b.dueDate);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((b) => (b.name || '').toLowerCase().includes(q) || (b.note || '').toLowerCase().includes(q));
    }
    if (filterStatus === 'paid') list = list.filter((b) => b.paid);
    if (filterStatus === 'pending') list = list.filter((b) => !b.paid);
    
    return list.sort((a, b) => {
      if (a.paid === b.paid) return new Date(a.dueDate) - new Date(b.dueDate);
      return a.paid ? 1 : -1;
    });
  }, [search, filterStatus, refreshKey, viewFilter, year, month]);

  const overdue = items.filter((b) => !b.paid && isPastDue(b.dueDate)).length;
  const pending = items.filter((b) => !b.paid).length;
  const totalPending = items.filter((b) => !b.paid).reduce((s, b) => s + Number(b.amount), 0);

  function validate() {
    const errs = {};
    if (!name.trim()) errs.name = 'Bill name is required';
    if (!amount || Number(amount) <= 0) errs.amount = 'Enter a valid amount';
    if (!dueDate) errs.dueDate = 'Due date is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!canEdit) return;
    if (!validate()) return;
    const data = { name: name.trim(), amount: Number(amount), dueDate, recurring, paid, note: note.trim() };
    if (editing) {
      updateItem('bills', editing.id, data);
      addToast('Bill updated');
    } else {
      addItem('bills', data);
      addToast('Bill added');
    }
    resetForm();
    triggerRefresh();
  }

  function resetForm() {
    setShowForm(false);
    setEditing(null);
    setName('');
    setAmount('');
    setDueDate('');
    setRecurring(false);
    setPaid(false);
    setNote('');
    setErrors({});
  }

  function startEdit(item) {
    setEditing(item);
    setName(item.name);
    setAmount(String(item.amount));
    setDueDate(item.dueDate);
    setRecurring(item.recurring || false);
    setPaid(item.paid || false);
    setNote(item.note || '');
    setShowForm(true);
  }

  function togglePaid(item) {
    if (!canEdit) {
      addToast('Cannot edit in this view');
      return;
    }
    const newlyPaid = !item.paid;
    
    if (newlyPaid) {
      // Auto add to expenses
      const exp = addItem('expenses', {
        title: `${item.name} (Bill)`,
        amount: item.amount,
        date: new Date().toISOString().split('T')[0],
        category: 'Bills',
        note: 'Auto-added from Bills'
      });

      updateItem('bills', item.id, { paid: true, expenseId: exp.id });
      
      if (item.recurring) {
        const currentDue = new Date(item.dueDate);
        currentDue.setMonth(currentDue.getMonth() + 1);
        const nextDueString = currentDue.toISOString().split('T')[0];
        
        addItem('bills', {
          name: item.name,
          amount: item.amount,
          dueDate: nextDueString,
          recurring: true,
          paid: false,
          note: item.note
        });
        addToast('Paid, added to Expenses & next month generated');
      } else {
        addToast('Bill paid & added to Expenses');
      }
    } else {
      // Mark as unpaid and remove the auto-added expense
      if (item.expenseId) {
        deleteItem('expenses', item.expenseId);
      }
      updateItem('bills', item.id, { paid: false, expenseId: null });
      addToast('Bill marked as pending');
    }
    
    triggerRefresh();
  }

  async function handleShareBill(bill) {
    const text = formatBillShareText(bill);
    const ok = await shareText('Muthu Bill Reminder', text);
    if (ok) addToast('Bill shared');
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Bills</h1>
          <p className="page-subtitle">Manage your bills & due dates</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <div className="card">
          <span className="text-xs text-ink-300 dark:text-ink-200">Pending Bills</span>
          <p className="text-xl font-bold text-ink dark:text-cream-50">{pending}</p>
        </div>
        <div className="card">
          <span className="text-xs text-ink-300 dark:text-ink-200">Pending Amount</span>
          <p className="currency text-xl font-bold text-ink dark:text-cream-50">{formatINR(totalPending)}</p>
        </div>
        {overdue > 0 && (
          <div className="card border-l-4 border-red-400">
            <span className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Overdue</span>
            <p className="text-xl font-bold text-red-500">{overdue}</p>
          </div>
        )}
      </div>

      <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />

      <div className="flex flex-col sm:flex-row gap-3 mb-4 mt-6">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Search bills..." /></div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-base sm:w-40">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Receipt} title="No bills" description="Add your recurring bills to stay on top of payments."
          action={canEdit ? <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Bill</button> : null} />
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => {
            const isOverdue = !item.paid && isPastDue(item.dueDate);
            return (
              <div key={item.id} className={`card flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-slide-up ${isOverdue ? 'border-l-4 border-red-400' : ''}`} style={{ animationDelay: `${i * 30}ms` }}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button onClick={() => togglePaid(item)} className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${item.paid ? 'bg-emerald-100 dark:bg-emerald-900/30' : isOverdue ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                    {item.paid ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : isOverdue ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <Clock className="w-4 h-4 text-amber-600" />}
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-medium truncate ${item.paid ? 'text-ink-300 line-through' : 'text-ink dark:text-cream-50'}`}>{item.name}</p>
                      {viewFilter === 'Family' && (
                        <span className="badge badge-gray">{item.addedBy || 'Muthu'}</span>
                      )}
                      {item.recurring && <span className="badge badge-blue"><RefreshCw className="w-3 h-3 mr-0.5" />Recurring</span>}
                      {isOverdue && <span className="badge badge-red">Overdue</span>}
                      {item.paid && <span className="badge badge-green">Paid</span>}
                    </div>
                    <p className="text-xs text-ink-300 dark:text-ink-200 truncate">
                      Due {formatDate(item.dueDate)}{item.note && ` · ${item.note}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <p className="currency font-semibold text-ink dark:text-cream-50">{formatINR(item.amount)}</p>
                  {canShare && (
                    <button onClick={() => handleShareBill(item)} className="p-2 rounded-lg hover:bg-cream-300 dark:hover:bg-ink-600 transition-colors"><Share2 className="w-4 h-4 text-ink-300" /></button>
                  )}
                  {canEdit && (
                    <>
                      <button onClick={() => startEdit(item)} className="p-2 rounded-lg hover:bg-cream-300 dark:hover:bg-ink-600 transition-colors"><Edit3 className="w-4 h-4 text-ink-300" /></button>
                      <button onClick={() => setDeleteId(item.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-4 h-4 text-red-400" /></button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showForm} onClose={resetForm} title={editing ? 'Edit Bill' : 'Add Bill'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Bill Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-base" placeholder="e.g. Electricity" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Amount (₹)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="input-base" placeholder="0" min="0" step="any" />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input-base" />
            {errors.dueDate && <p className="text-red-500 text-xs mt-1">{errors.dueDate}</p>}
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="w-4 h-4 rounded border-ink-200 text-brand-600 focus:ring-brand-500" />
              <span className="text-sm text-ink dark:text-cream-50">Recurring</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="w-4 h-4 rounded border-ink-200 text-brand-600 focus:ring-brand-500" />
              <span className="text-sm text-ink dark:text-cream-50">Already Paid</span>
            </label>
          </div>
          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Note (optional)</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="input-base" placeholder="Optional note" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={resetForm} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">{editing ? 'Update' : 'Add'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { deleteItem('bills', deleteId); setDeleteId(null); addToast('Bill deleted'); triggerRefresh(); }}
        title="Delete Bill" message="Are you sure you want to delete this bill?" />
    </div>
  );
}
