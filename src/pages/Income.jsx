import { useState, useMemo } from 'react';
import { getItemsForMonth, getAll, addItem, updateItem, deleteItem, filterByProfile } from '../utils/storage';
import { formatINR, formatDate, getCurrentMonthYear } from '../utils/formatters';
import { useApp } from '../contexts/AppContext';
import MonthPicker from '../components/ui/MonthPicker';
import SearchBar from '../components/ui/SearchBar';
import Modal, { ConfirmModal } from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { ArrowDownCircle, Plus, Edit3, Trash2, Filter } from 'lucide-react';

const CATEGORIES = ['Freelance', 'Business', 'Rental', 'Interest', 'Gift', 'Refund', 'Dividend', 'Other'];

export default function Income() {
  const { year: curYear, month: curMonth } = getCurrentMonthYear();
  const [year, setYear] = useState(curYear);
  const [month, setMonth] = useState(curMonth);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const { addToast, refreshKey, triggerRefresh, viewFilter, canEdit } = useApp();

  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});

  const items = useMemo(() => {
    let list = getItemsForMonth('income', year, month);
    list = filterByProfile(list, viewFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((i) => (i.source || '').toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q) || (i.note || '').toLowerCase().includes(q));
    }
    if (filterCat) list = list.filter((i) => i.category === filterCat);
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [year, month, search, filterCat, refreshKey, viewFilter]);

  const totalIncome = items.reduce((s, i) => s + Number(i.amount), 0);

  function validate() {
    const errs = {};
    if (!source.trim()) errs.source = 'Source is required';
    if (!amount || Number(amount) <= 0) errs.amount = 'Enter a valid amount';
    if (!date) errs.date = 'Date is required';
    if (!category) errs.category = 'Select a category';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!canEdit) return;
    if (!validate()) return;
    const data = { source: source.trim(), amount: Number(amount), category, date, note: note.trim() };
    if (editing) {
      updateItem('income', editing.id, data);
      addToast('Income updated');
    } else {
      addItem('income', data);
      addToast('Income added');
    }
    resetForm();
    triggerRefresh();
  }

  function resetForm() {
    setShowForm(false);
    setEditing(null);
    setSource('');
    setAmount('');
    setCategory('');
    setDate('');
    setNote('');
    setErrors({});
  }

  function startEdit(item) {
    setEditing(item);
    setSource(item.source);
    setAmount(String(item.amount));
    setCategory(item.category);
    setDate(item.date);
    setNote(item.note || '');
    setShowForm(true);
  }

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="page-title">Income</h1>
          <p className="page-subtitle">Non-salary income entries</p>
        </div>
        <div className="flex items-center gap-2">
          <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
          {canEdit && (
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Add
            </button>
          )}
        </div>
      </div>

      <div className="card mb-4 border-l-4 border-emerald-500">
        <span className="text-xs text-ink-300 dark:text-ink-200">Total Income This Month</span>
        <p className="currency text-xl font-bold text-ink dark:text-cream-50">{formatINR(totalIncome)}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Search income..." /></div>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="input-base sm:w-40">
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={ArrowDownCircle} title="No income entries" description="Add your non-salary income like freelance, rental, interest, etc."
          action={canEdit ? <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Income</button> : null} />
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={item.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-ink dark:text-cream-50 truncate">{item.source}</p>
                  {viewFilter === 'Family' && (
                    <span className="badge badge-gray">{item.addedBy || 'Muthu'}</span>
                  )}
                  <span className="badge badge-green">{item.category}</span>
                </div>
                <p className="text-xs text-ink-300 dark:text-ink-200 mt-0.5">{formatDate(item.date)}{item.note && ` · ${item.note}`}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <p className="currency font-semibold text-emerald-600">{formatINR(item.amount)}</p>
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

      <Modal isOpen={showForm} onClose={resetForm} title={editing ? 'Edit Income' : 'Add Income'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Source</label>
            <input type="text" value={source} onChange={(e) => setSource(e.target.value)} className="input-base" placeholder="e.g. Freelance project" />
            {errors.source && <p className="text-red-500 text-xs mt-1">{errors.source}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Amount (₹)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="input-base" placeholder="0" min="0" step="any" />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-base">
              <option value="">Select category</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
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

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { deleteItem('income', deleteId); setDeleteId(null); addToast('Income deleted'); triggerRefresh(); }}
        title="Delete Income" message="Are you sure you want to delete this income entry?" />
    </div>
  );
}
