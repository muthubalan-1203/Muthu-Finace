import { useState, useMemo } from 'react';
import { getAll, addItem, updateItem, deleteItem } from '../utils/storage';
import { useApp } from '../contexts/AppContext';
import { filterByProfile } from '../utils/storage';
import Modal, { ConfirmModal } from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import SearchBar from '../components/ui/SearchBar';
import { formatINR, formatDate } from '../utils/formatters';
import {
  Plus, Landmark, Edit3, Trash2, ChevronDown, ChevronUp,
  CalendarDays, User, Percent, TrendingDown, TrendingUp,
  CheckCircle2, Clock, AlertCircle, CreditCard, X, Check, IndianRupee,
} from 'lucide-react';

// ─── EMI Calculator ────────────────────────────────────────────────────────
function calcEMI(principal, annualRate, tenureMonths) {
  if (!principal || !annualRate || !tenureMonths) return 0;
  const r = annualRate / 12 / 100;
  if (r === 0) return principal / tenureMonths;
  return (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
}

function calcTotalInterest(principal, emi, tenure) {
  return emi * tenure - principal;
}

// ─── Status badge ──────────────────────────────────────────────────────────
function StatusBadge({ loan }) {
  const paid = (loan.payments || []).reduce((s, p) => s + Number(p.amount), 0);
  const total = Number(loan.totalAmount || loan.principal);
  if (paid >= total) return <span className="badge" style={{ background: '#d1fae5', color: '#065f46' }}><CheckCircle2 className="w-3 h-3 mr-0.5" />Closed</span>;
  const emi = calcEMI(Number(loan.principal), Number(loan.interestRate), Number(loan.tenure));
  const nextDue = getNextDueDate(loan);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(nextDue); due.setHours(0, 0, 0, 0);
  if (due < today) return <span className="badge" style={{ background: '#fee2e2', color: '#991b1b' }}><AlertCircle className="w-3 h-3 mr-0.5" />Overdue</span>;
  return <span className="badge" style={{ background: '#dbeafe', color: '#1e40af' }}><Clock className="w-3 h-3 mr-0.5" />Active</span>;
}

function getNextDueDate(loan) {
  const payments = loan.payments || [];
  const start = new Date(loan.startDate);
  const paidCount = payments.length;
  const next = new Date(start);
  next.setMonth(next.getMonth() + paidCount + 1);
  return next.toISOString().split('T')[0];
}

// ─── Payment Panel ─────────────────────────────────────────────────────────
function PaymentPanel({ loan, deviceProfile, addToast, triggerRefresh, refreshKey, canEdit }) {
  const [expanded, setExpanded] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNote, setPayNote] = useState('');
  const [deletePayId, setDeletePayId] = useState(null);

  const payments = loan.payments || [];
  const emi = calcEMI(Number(loan.principal), Number(loan.interestRate), Number(loan.tenure));
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalDue = Number(loan.totalAmount || (emi * Number(loan.tenure)));
  const outstanding = Math.max(0, totalDue - totalPaid);
  const progress = Math.min(100, (totalPaid / totalDue) * 100);

  function addPayment(e) {
    e.preventDefault();
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) return;
    const newPayments = [...payments, { id: Date.now().toString(36), amount: amt, date: payDate, note: payNote.trim(), paidBy: deviceProfile }];
    updateItem('loans', loan.id, { payments: newPayments });
    setPayAmount(''); setPayNote(''); setPayDate(new Date().toISOString().split('T')[0]);
    addToast('Payment recorded');
    triggerRefresh();
  }

  function deletePayment() {
    const newPayments = payments.filter(p => p.id !== deletePayId);
    updateItem('loans', loan.id, { payments: newPayments });
    setDeletePayId(null);
    addToast('Payment deleted');
    triggerRefresh();
  }

  const isClosed = totalPaid >= totalDue;

  return (
    <div className="mt-3 border-t border-cream-200 dark:border-ink-600 pt-3">
      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-ink-300 dark:text-ink-200">Paid {formatINR(totalPaid)}</span>
          <span className="text-ink-300 dark:text-ink-200">Remaining {formatINR(outstanding)}</span>
        </div>
        <div className="h-2 bg-cream-200 dark:bg-ink-600 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: isClosed ? '#10b981' : 'linear-gradient(90deg, #6366f1, #8b5cf6)' }}
          />
        </div>
        <div className="text-right text-[10px] text-ink-300 dark:text-ink-400 mt-0.5">{Math.round(progress)}% paid</div>
      </div>

      {/* Toggle payments */}
      <button onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-ink-300 dark:text-ink-200 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
        <CreditCard className="w-3.5 h-3.5" />
        {payments.length > 0 ? `${payments.length} Payment${payments.length > 1 ? 's' : ''}` : 'Payments'}
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {payments.length === 0 && <p className="text-xs text-ink-300 italic">No payments recorded yet.</p>}
          {payments.map((p) => {
            const isOwner = (p.paidBy || 'Muthu') === deviceProfile;
            return (
              <div key={p.id} className="flex items-center justify-between bg-cream-100 dark:bg-ink-700 rounded-lg px-3 py-2 gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">{formatINR(p.amount)}</span>
                    <span className="text-[10px] text-ink-300">{formatDate(p.date)}</span>
                    {p.paidBy && <span className="text-[10px] badge badge-gray">{p.paidBy}</span>}
                  </div>
                  {p.note && <p className="text-xs text-ink-300 truncate mt-0.5">{p.note}</p>}
                </div>
                {isOwner && canEdit && (
                  <button onClick={() => setDeletePayId(p.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0">
                    <X className="w-3 h-3 text-red-400" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Add payment form */}
          {!isClosed && (
            <form onSubmit={addPayment} className="space-y-2 pt-1">
              <div className="flex gap-2">
                <input type="number" placeholder="Amount" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                  className="input-base flex-1 text-sm" min="1" step="0.01" />
                <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)}
                  className="input-base text-sm" style={{ width: 130 }} />
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="Note (optional)" value={payNote} onChange={e => setPayNote(e.target.value)}
                  className="input-base flex-1 text-sm" />
                <button type="submit" disabled={!payAmount}
                  className="p-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white transition-colors flex-shrink-0">
                  <Check className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-ink-300">EMI: {formatINR(emi)} / month</p>
            </form>
          )}
          {isClosed && <p className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Loan fully repaid!</p>}
        </div>
      )}

      <ConfirmModal isOpen={!!deletePayId} onClose={() => setDeletePayId(null)} onConfirm={deletePayment}
        title="Delete Payment" message="Are you sure you want to delete this payment record?" />
    </div>
  );
}

// ─── Main Loans Page ────────────────────────────────────────────────────────
export default function Loans() {
  const { addToast, refreshKey, triggerRefresh, viewFilter, canEdit, deviceProfile } = useApp();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  // Form fields
  const [loanName, setLoanName] = useState('');
  const [loanType, setLoanType] = useState('borrowed'); // 'borrowed' | 'lent'
  const [personName, setPersonName] = useState('');
  const [principal, setPrincipal] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [tenure, setTenure] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  // EMI preview
  const emiPreview = useMemo(() => {
    const p = parseFloat(principal); const r = parseFloat(interestRate); const t = parseInt(tenure);
    if (!p || !r || !t) return null;
    const emi = calcEMI(p, r, t);
    const totalAmt = emi * t;
    const totalInt = calcTotalInterest(p, emi, t);
    return { emi, totalAmt, totalInt };
  }, [principal, interestRate, tenure]);

  const allLoans = useMemo(() => {
    let loans = getAll('loans');
    loans = filterByProfile(loans, viewFilter);
    return loans.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  }, [refreshKey, viewFilter]);

  const stats = useMemo(() => {
    let totalBorrowed = 0, totalLent = 0, totalOutstanding = 0;
    allLoans.forEach(loan => {
      const emi = calcEMI(Number(loan.principal), Number(loan.interestRate), Number(loan.tenure));
      const totalDue = emi * Number(loan.tenure);
      const totalPaid = (loan.payments || []).reduce((s, p) => s + Number(p.amount), 0);
      const outstanding = Math.max(0, totalDue - totalPaid);
      if (loan.loanType === 'borrowed') totalBorrowed += outstanding;
      else totalLent += outstanding;
      totalOutstanding += outstanding;
    });
    return { totalBorrowed, totalLent, totalOutstanding };
  }, [allLoans]);

  const items = useMemo(() => {
    let list = allLoans;
    if (search) { const q = search.toLowerCase(); list = list.filter(l => (l.loanName || '').toLowerCase().includes(q) || (l.personName || '').toLowerCase().includes(q)); }
    if (filterType) list = list.filter(l => l.loanType === filterType);
    return list;
  }, [allLoans, search, filterType]);

  function validate() {
    const errs = {};
    if (!loanName.trim()) errs.loanName = 'Loan name required';
    if (!personName.trim()) errs.personName = 'Person name required';
    if (!principal || isNaN(principal) || Number(principal) <= 0) errs.principal = 'Valid amount required';
    if (!interestRate || isNaN(interestRate) || Number(interestRate) < 0) errs.interestRate = 'Valid interest rate required';
    if (!tenure || isNaN(tenure) || Number(tenure) <= 0) errs.tenure = 'Valid tenure required';
    if (!startDate) errs.startDate = 'Start date required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!canEdit || !validate()) return;
    const emi = calcEMI(parseFloat(principal), parseFloat(interestRate), parseInt(tenure));
    const data = {
      loanName: loanName.trim(), loanType, personName: personName.trim(),
      principal: parseFloat(principal), interestRate: parseFloat(interestRate),
      tenure: parseInt(tenure), startDate, notes: notes.trim(),
      totalAmount: emi * parseInt(tenure),
      payments: editing?.payments || [],
    };
    if (editing) { updateItem('loans', editing.id, data); addToast('Loan updated'); }
    else { addItem('loans', data); addToast('Loan added'); }
    resetForm(); triggerRefresh();
  }

  function resetForm() {
    setShowForm(false); setEditing(null);
    setLoanName(''); setLoanType('borrowed'); setPersonName('');
    setPrincipal(''); setInterestRate(''); setTenure('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setNotes(''); setErrors({});
  }

  function startEdit(loan) {
    setEditing(loan);
    setLoanName(loan.loanName || ''); setLoanType(loan.loanType || 'borrowed');
    setPersonName(loan.personName || ''); setPrincipal(String(loan.principal || ''));
    setInterestRate(String(loan.interestRate || '')); setTenure(String(loan.tenure || ''));
    setStartDate(loan.startDate || new Date().toISOString().split('T')[0]);
    setNotes(loan.notes || '');
    setShowForm(true);
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Loans</h1>
          <p className="page-subtitle">Track borrowed & lent money</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Loan
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card text-center py-3">
          <p className="text-xs text-ink-300 dark:text-ink-200 mb-1 flex items-center justify-center gap-1"><TrendingDown className="w-3 h-3 text-red-400" />Borrowed</p>
          <p className="text-lg font-bold text-red-500">{formatINR(stats.totalBorrowed)}</p>
          <p className="text-[10px] text-ink-300">I owe</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xs text-ink-300 dark:text-ink-200 mb-1 flex items-center justify-center gap-1"><TrendingUp className="w-3 h-3 text-green-500" />Lent</p>
          <p className="text-lg font-bold text-green-600">{formatINR(stats.totalLent)}</p>
          <p className="text-[10px] text-ink-300">Owed to me</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xs text-ink-300 dark:text-ink-200 mb-1 flex items-center justify-center gap-1"><Landmark className="w-3 h-3 text-brand-500" />Outstanding</p>
          <p className="text-lg font-bold text-brand-600 dark:text-brand-400">{formatINR(stats.totalOutstanding)}</p>
          <p className="text-[10px] text-ink-300">Total pending</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Search loans or person..." /></div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input-base sm:w-40">
          <option value="">All Types</option>
          <option value="borrowed">Borrowed</option>
          <option value="lent">Lent</option>
        </select>
      </div>

      {/* Loan cards */}
      {items.length === 0 ? (
        <EmptyState icon={Landmark} title="No loans" description="Track money you've borrowed or lent to others."
          action={canEdit ? <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" />Add Loan</button> : null} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((loan, i) => {
            const isBorrowed = loan.loanType === 'borrowed';
            const emi = calcEMI(Number(loan.principal), Number(loan.interestRate), Number(loan.tenure));
            const totalDue = emi * Number(loan.tenure);
            const totalPaid = (loan.payments || []).reduce((s, p) => s + Number(p.amount), 0);
            const outstanding = Math.max(0, totalDue - totalPaid);
            const isClosed = outstanding <= 0;
            const nextDue = !isClosed ? getNextDueDate(loan) : null;

            return (
              <div key={loan.id} className="card animate-slide-up" style={{ animationDelay: `${i * 40}ms`, borderLeft: `3px solid ${isBorrowed ? '#ef4444' : '#10b981'}` }}>
                {/* Card header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-ink dark:text-cream-50">{loan.loanName}</h3>
                      <span className={`badge text-[10px] ${isBorrowed ? 'badge-red' : 'badge-green'}`}>
                        {isBorrowed ? <TrendingDown className="w-3 h-3 mr-0.5" /> : <TrendingUp className="w-3 h-3 mr-0.5" />}
                        {isBorrowed ? 'Borrowed' : 'Lent'}
                      </span>
                      <StatusBadge loan={loan} />
                    </div>
                    <p className="text-xs text-ink-300 dark:text-ink-400 flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3" />{loan.personName}
                    </p>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => startEdit(loan)} className="p-1.5 rounded-lg hover:bg-cream-300 dark:hover:bg-ink-600 transition-colors"><Edit3 className="w-3.5 h-3.5 text-ink-300" /></button>
                      <button onClick={() => setDeleteId(loan.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                    </div>
                  )}
                </div>

                {/* Loan details grid */}
                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                  <div className="bg-cream-50 dark:bg-ink-600 rounded-lg p-2">
                    <p className="text-ink-300 mb-0.5">Principal</p>
                    <p className="font-bold text-ink dark:text-cream-50">{formatINR(loan.principal)}</p>
                  </div>
                  <div className="bg-cream-50 dark:bg-ink-600 rounded-lg p-2">
                    <p className="text-ink-300 mb-0.5">EMI / Month</p>
                    <p className="font-bold text-brand-600 dark:text-brand-400">{formatINR(emi)}</p>
                  </div>
                  <div className="bg-cream-50 dark:bg-ink-600 rounded-lg p-2">
                    <p className="text-ink-300 mb-0.5">Interest</p>
                    <p className="font-bold text-ink dark:text-cream-50">{loan.interestRate}% p.a.</p>
                  </div>
                  <div className="bg-cream-50 dark:bg-ink-600 rounded-lg p-2">
                    <p className="text-ink-300 mb-0.5">Tenure</p>
                    <p className="font-bold text-ink dark:text-cream-50">{loan.tenure} months</p>
                  </div>
                </div>

                {/* Dates */}
                <div className="flex items-center gap-4 text-xs text-ink-300 mb-2">
                  <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />Started: {formatDate(loan.startDate)}</span>
                  {nextDue && <span className="flex items-center gap-1 text-orange-500"><Clock className="w-3 h-3" />Due: {formatDate(nextDue)}</span>}
                </div>

                {/* Outstanding */}
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-ink-300">Outstanding</span>
                  <span className={`font-bold ${isClosed ? 'text-green-600' : isBorrowed ? 'text-red-500' : 'text-green-600'}`}>
                    {isClosed ? 'Fully Paid ✓' : formatINR(outstanding)}
                  </span>
                </div>

                {loan.notes && <p className="text-xs text-ink-300 italic mb-2 line-clamp-2">{loan.notes}</p>}

                {/* Payment panel */}
                <PaymentPanel loan={loan} deviceProfile={deviceProfile} addToast={addToast}
                  triggerRefresh={triggerRefresh} refreshKey={refreshKey} canEdit={canEdit} />
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showForm} onClose={resetForm} title={editing ? 'Edit Loan' : 'Add Loan'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type selector */}
          <div className="grid grid-cols-2 gap-2">
            {['borrowed', 'lent'].map(t => (
              <button key={t} type="button" onClick={() => setLoanType(t)}
                className={`py-2.5 rounded-xl font-medium text-sm transition-all border ${loanType === t
                  ? t === 'borrowed' ? 'bg-red-500 text-white border-red-500' : 'bg-green-500 text-white border-green-500'
                  : 'bg-transparent text-ink-300 border-cream-300 dark:border-ink-500 hover:border-brand-400'}`}>
                {t === 'borrowed' ? '💸 I Borrowed' : '🤝 I Lent'}
              </button>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Loan Name</label>
            <input type="text" value={loanName} onChange={e => setLoanName(e.target.value)} className="input-base" placeholder="e.g. Home Loan, Personal Loan" />
            {errors.loanName && <p className="text-red-500 text-xs mt-1">{errors.loanName}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">
              {loanType === 'borrowed' ? 'Borrowed from' : 'Lent to'}
            </label>
            <input type="text" value={personName} onChange={e => setPersonName(e.target.value)} className="input-base" placeholder="Person / Bank / Institution name" />
            {errors.personName && <p className="text-red-500 text-xs mt-1">{errors.personName}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Principal Amount (₹)</label>
              <input type="number" value={principal} onChange={e => setPrincipal(e.target.value)} className="input-base" placeholder="e.g. 50000" min="1" />
              {errors.principal && <p className="text-red-500 text-xs mt-1">{errors.principal}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Interest Rate (% p.a.)</label>
              <input type="number" value={interestRate} onChange={e => setInterestRate(e.target.value)} className="input-base" placeholder="e.g. 12" min="0" step="0.01" />
              {errors.interestRate && <p className="text-red-500 text-xs mt-1">{errors.interestRate}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Tenure (Months)</label>
              <input type="number" value={tenure} onChange={e => setTenure(e.target.value)} className="input-base" placeholder="e.g. 24" min="1" />
              {errors.tenure && <p className="text-red-500 text-xs mt-1">{errors.tenure}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-base" />
              {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
            </div>
          </div>

          {/* EMI Preview */}
          {emiPreview && (
            <div className="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-ink-300 mb-0.5">Monthly EMI</p>
                <p className="text-sm font-bold text-brand-600 dark:text-brand-400">{formatINR(emiPreview.emi)}</p>
              </div>
              <div>
                <p className="text-[10px] text-ink-300 mb-0.5">Total Interest</p>
                <p className="text-sm font-bold text-orange-500">{formatINR(emiPreview.totalInt)}</p>
              </div>
              <div>
                <p className="text-[10px] text-ink-300 mb-0.5">Total Amount</p>
                <p className="text-sm font-bold text-ink dark:text-cream-50">{formatINR(emiPreview.totalAmt)}</p>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Notes (Optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input-base min-h-[70px] resize-none" placeholder="Any additional details..." rows={2} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={resetForm} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">{editing ? 'Update' : 'Add Loan'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => { deleteItem('loans', deleteId); setDeleteId(null); addToast('Loan deleted'); triggerRefresh(); }}
        title="Delete Loan" message="Are you sure? All payment history will also be deleted." />
    </div>
  );
}
