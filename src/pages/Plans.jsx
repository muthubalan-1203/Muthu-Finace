import { useState, useMemo } from 'react';
import { getAll, addItem, updateItem, deleteItem } from '../utils/storage';
import { useApp } from '../contexts/AppContext';
import { filterByProfile } from '../utils/storage';
import SearchBar from '../components/ui/SearchBar';
import Modal, { ConfirmModal } from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { formatDate, getCurrentMonthYear } from '../utils/formatters';
import MonthPicker from '../components/ui/MonthPicker';
import { Plus, ClipboardList, Edit3, Trash2, Calendar, Tag, X } from 'lucide-react';

export default function Plans() {
  const { year: curYear, month: curMonth } = getCurrentMonthYear();
  const [year, setYear] = useState(curYear);
  const [month, setMonth] = useState(curMonth);
  const { addToast, refreshKey, triggerRefresh, viewFilter, canEdit } = useApp();
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [errors, setErrors] = useState({});

  const allPlans = useMemo(() => {
    let plans = getAll('plans');
    plans = filterByProfile(plans, viewFilter);
    // Filter by month/year
    plans = plans.filter(p => {
      if (!p.date) return true;
      const d = new Date(p.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    return plans.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [refreshKey, viewFilter, year, month]);

  const allTags = useMemo(() => {
    const set = new Set();
    allPlans.forEach((n) => (n.tags || []).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [allPlans]);

  const items = useMemo(() => {
    let list = allPlans;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((n) => (n.name || '').toLowerCase().includes(q) || (n.description || '').toLowerCase().includes(q) || (n.tags || []).some((t) => t.toLowerCase().includes(q)));
    }
    if (filterTag) list = list.filter((n) => (n.tags || []).includes(filterTag));
    return list;
  }, [allPlans, search, filterTag]);

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput('');
  }

  function removeTag(t) {
    setTags(tags.filter((tag) => tag !== t));
  }

  function validate() {
    const errs = {};
    if (!name.trim()) errs.name = 'Plan name is required';
    if (!date) errs.date = 'Date is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!canEdit) return;
    if (!validate()) return;
    const data = { name: name.trim(), date, description: description.trim(), tags };
    if (editing) {
      updateItem('plans', editing.id, data);
      addToast('Plan updated');
    } else {
      addItem('plans', data);
      addToast('Plan created');
    }
    resetForm();
    triggerRefresh();
  }

  function resetForm() {
    setShowForm(false);
    setEditing(null);
    setName('');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setTags([]);
    setTagInput('');
    setErrors({});
  }

  function startEdit(plan) {
    setEditing(plan);
    setName(plan.name);
    setDate(plan.date || new Date().toISOString().split('T')[0]);
    setDescription(plan.description || '');
    setTags(plan.tags || []);
    setShowForm(true);
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Plans</h1>
          <p className="page-subtitle">Your future plans & events</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add
          </button>
        )}
      </div>

      <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />

      <div className="flex flex-col sm:flex-row gap-3 mb-4 mt-6">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Search plans..." /></div>
        {allTags.length > 0 && (
          <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)} className="input-base sm:w-40">
            <option value="">All Tags</option>
            {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No plans" description="Create plans for future events, savings, or goals."
          action={canEdit ? <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Plan</button> : null} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((plan, i) => (
            <div key={plan.id} className="card animate-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <h3 className="font-medium text-ink dark:text-cream-50 truncate">{plan.name}</h3>
                  {viewFilter === 'Family' && (
                    <span className="badge badge-gray">{plan.addedBy || 'Muthu'}</span>
                  )}
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(plan)} className="p-1.5 rounded-lg hover:bg-cream-300 dark:hover:bg-ink-600 transition-colors"><Edit3 className="w-3.5 h-3.5 text-ink-300" /></button>
                    <button onClick={() => setDeleteId(plan.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                  </div>
                )}
              </div>
              <p className="text-xs text-brand-600 dark:text-brand-400 font-medium flex items-center gap-1 mb-2">
                <Calendar className="w-3 h-3" /> {formatDate(plan.date)}
              </p>
              {plan.description && (
                <p className="text-sm text-ink-300 dark:text-ink-200 mb-2 line-clamp-3 whitespace-pre-wrap break-words">{plan.description}</p>
              )}
              {plan.tags && plan.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {plan.tags.map((t) => (
                    <span key={t} className="badge badge-blue cursor-pointer" onClick={() => setFilterTag(t)}>
                      <Tag className="w-3 h-3 mr-0.5" />{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showForm} onClose={resetForm} title={editing ? 'Edit Plan' : 'Add Plan'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Plan Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-base" placeholder="e.g. Buy a new car" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-base" />
            {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Description (Optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-base min-h-[100px] resize-y" placeholder="Details about this plan..." rows={4} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Tags (Optional)</label>
            <div className="flex gap-2">
              <input
                type="text" value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                className="input-base flex-1" placeholder="Add tag..."
              />
              <button type="button" onClick={addTag} className="btn-secondary">Add</button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((t) => (
                  <span key={t} className="badge badge-blue flex items-center gap-1">
                    {t}
                    <button type="button" onClick={() => removeTag(t)}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={resetForm} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">{editing ? 'Update' : 'Add'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { deleteItem('plans', deleteId); setDeleteId(null); addToast('Plan deleted'); triggerRefresh(); }}
        title="Delete Plan" message="Are you sure you want to delete this plan?" />
    </div>
  );
}
