import { useState, useMemo } from 'react';
import { getAll, getItemsForMonth, addItem, updateItem, deleteItem, filterByProfile } from '../utils/storage';
import { formatINR, formatDate, getCurrentMonthYear } from '../utils/formatters';
import { useApp } from '../contexts/AppContext';
import MonthPicker from '../components/ui/MonthPicker';
import SearchBar from '../components/ui/SearchBar';
import Modal, { ConfirmModal } from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { ArrowUpCircle, Plus, Edit3, Trash2 } from 'lucide-react';

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Education', 'Utilities', 'Rent', 'Insurance', 'Travel', 'Groceries', 'Personal Care', 'Other'];
const PAYMENT_METHODS = ['Cash', 'UPI', 'Debit Card', 'Credit Card', 'Net Banking', 'Wallet', 'Other'];

export default function Expenses() {
  const { year: curYear, month: curMonth } = getCurrentMonthYear();
  const [year, setYear] = useState(curYear);
  const [month, setMonth] = useState(curMonth);
  const [timeFilter, setTimeFilter] = useState('This Month');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const { addToast, refreshKey, triggerRefresh, viewFilter, canEdit } = useApp();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});

  const items = useMemo(() => {
    let list = (timeFilter === 'This Month') ? getItemsForMonth('expenses', year, month) : getAll('expenses');
    list = filterByProfile(list, viewFilter);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    if (timeFilter === 'Today') {
      list = list.filter(e => new Date(e.date) >= today);
    } else if (timeFilter === 'Yesterday') {
      list = list.filter(e => {
        const d = new Date(e.date);
        return d >= yesterday && d < today;
      });
    } else if (timeFilter === 'This Week') {
      list = list.filter(e => new Date(e.date) >= startOfWeek);
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((e) => (e.title || '').toLowerCase().includes(q) || (e.category || '').toLowerCase().includes(q) || (e.note || '').toLowerCase().includes(q));
    }
    if (filterCat) list = list.filter((e) => e.category === filterCat);
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [year, month, timeFilter, search, filterCat, refreshKey, viewFilter]);

  const groupedItems = useMemo(() => {
    const groups = {};
    items.forEach(item => {
      if (!groups[item.date]) {
        groups[item.date] = [];
      }
      groups[item.date].push(item);
    });
    return Object.keys(groups)
      .sort((a, b) => new Date(b) - new Date(a))
      .map(date => ({ date, items: groups[date] }));
  }, [items]);

  const totalExpenses = items.reduce((s, e) => s + Number(e.amount), 0);

  function validate() {
    const errs = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (!amount || Number(amount) <= 0) errs.amount = 'Enter a valid amount';
    if (!date) errs.date = 'Date is required';
    if (!category) errs.category = 'Select a category';
    if (!paymentMethod) errs.paymentMethod = 'Select a payment method';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!canEdit) return;
    if (!validate()) return;
    const data = { title: title.trim(), amount: Number(amount), category, paymentMethod, date, note: note.trim() };
    if (editing) {
      updateItem('expenses', editing.id, data);
      addToast('Expense updated');
    } else {
      addItem('expenses', data);
      addToast('Expense added');
    }
    resetForm();
    triggerRefresh();
  }

  function resetForm() {
    setShowForm(false);
    setEditing(null);
    setTitle('');
    setAmount('');
    setCategory('');
    setPaymentMethod('');
    setDate('');
    setNote('');
    setErrors({});
  }

  function startEdit(item) {
    setEditing(item);
    setTitle(item.title);
    setAmount(String(item.amount));
    setCategory(item.category);
    setPaymentMethod(item.paymentMethod);
    setDate(item.date);
    setNote(item.note || '');
    setShowForm(true);
  }

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Track your spending</p>
        </div>
        <div className="flex items-center gap-2">
          {timeFilter === 'This Month' && <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />}
          {canEdit && (
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Add
            </button>
          )}
        </div>
      </div>

      <div className="flex overflow-x-auto gap-2 pb-2 mb-4 scrollbar-hide">
        {['Today', 'Yesterday', 'This Week', 'This Month', 'All Time'].map(p => (
          <button key={p} onClick={() => setTimeFilter(p)} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${timeFilter === p ? 'bg-brand-500 text-white shadow-md' : 'bg-white dark:bg-ink-800 text-ink-600 dark:text-ink-300 border border-ink-200 dark:border-ink-700 hover:bg-cream-100 dark:hover:bg-ink-700'}`}>
            {p}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="card flex-1 border-l-4 border-red-400 py-3">
          <span className="text-xs text-ink-300 dark:text-ink-200">{timeFilter} Expenses</span>
          <p className="currency text-xl font-bold text-ink dark:text-cream-50">{formatINR(totalExpenses)}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Search expenses..." /></div>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="input-base sm:w-40">
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={ArrowUpCircle} title="No expenses" description="Start logging your expenses to track spending."
          action={canEdit ? <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Expense</button> : null} />
      ) : (
        <div className="space-y-6">
          {groupedItems.map((group, groupIdx) => (
            <div key={group.date} className="animate-fade-in" style={{ animationDelay: `${groupIdx * 30}ms` }}>
              <h3 className="text-sm font-bold text-ink-400 dark:text-ink-200 mb-2 px-1 border-b border-ink-100 dark:border-ink-800 pb-1">
                {formatDate(group.date)}
              </h3>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <div key={item.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-ink dark:text-cream-50 truncate">{item.title}</p>
                        {viewFilter === 'Family' && (
                          <span className="badge badge-gray">{item.addedBy || 'Muthu'}</span>
                        )}
                        <span className="badge badge-red">{item.category}</span>
                        <span className="badge badge-gray">{item.paymentMethod}</span>
                      </div>
                      {item.note && <p className="text-xs text-ink-300 dark:text-ink-200 mt-0.5">{item.note}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <p className="currency font-semibold text-red-500">{formatINR(item.amount)}</p>
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
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showForm} onClose={resetForm} title={editing ? 'Edit Expense' : 'Add Expense'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input-base" placeholder="e.g. Grocery shopping" />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Amount (₹)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="input-base" placeholder="0" min="0" step="any" />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-base">
                <option value="">Select</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Payment</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input-base">
                <option value="">Select</option>
                {PAYMENT_METHODS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              {errors.paymentMethod && <p className="text-red-500 text-xs mt-1">{errors.paymentMethod}</p>}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-base" />
            {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
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

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { deleteItem('expenses', deleteId); setDeleteId(null); addToast('Expense deleted'); triggerRefresh(); }}
        title="Delete Expense" message="Are you sure you want to delete this expense entry?" />
    </div>
  );
}
