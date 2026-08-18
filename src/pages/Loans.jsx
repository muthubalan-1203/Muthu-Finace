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
  CalendarDays, User, TrendingDown, TrendingUp,
  CheckCircle2, Clock, AlertCircle, CreditCard, X, Check,
  IndianRupee, Info,
} from 'lucide-react';

// ─── Compute full amortization from payments ────────────────────────────────
function computeSchedule(loan) {
  const principal = Number(loan.principal);
  const monthlyRate = Number(loan.interestRate) / 100; // already monthly %
  const payments = (loan.payments || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));

  let balance = principal;
  const rows = [];
  let totalInterestPaid = 0;
  let totalPrincipalPaid = 0;

  payments.forEach((p) => {
    const interestDue = parseFloat((balance * monthlyRate).toFixed(2));
    const payment = Number(p.amount);
    const principalPaid = parseFloat(Math.max(0, payment - interestDue).toFixed(2));
    const interestPaid = parseFloat(Math.min(payment, interestDue).toFixed(2));
    balance = parseFloat(Math.max(0, balance - principalPaid).toFixed(2));
    totalInterestPaid += interestPaid;
    totalPrincipalPaid += principalPaid;
    rows.push({
      ...p,
      interestPaid,
      principalPaid,
      balance,
      payment,
    });
  });

  return { rows, balance, totalInterestPaid, totalPrincipalPaid };
}

// ─── Status badge ──────────────────────────────────────────────────────────
function StatusBadge({ balance }) {
  if (balance <= 0) return (
    <span className="badge" style={{ background: '#d1fae5', color: '#065f46', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      <CheckCircle2 className="w-3 h-3" />Closed
    </span>
  );
  return (
    <span className="badge" style={{ background: '#dbeafe', color: '#1e40af', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      <Clock className="w-3 h-3" />Active
    </span>
  );
}

// ─── Payment Panel ─────────────────────────────────────────────────────────
function PaymentPanel({ loan, deviceProfile, addToast, triggerRefresh, refreshKey, canEdit }) {
  const [expanded, setExpanded] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNote, setPayNote] = useState('');
  const [deletePayId, setDeletePayId] = useState(null);

  const { rows, balance, totalInterestPaid, totalPrincipalPaid } = useMemo(
    () => computeSchedule(loan), [loan, refreshKey]
  );

  const principal = Number(loan.principal);
  const monthlyRate = Number(loan.interestRate) / 100;
  const isClosed = balance <= 0;
  const progress = Math.min(100, ((principal - balance) / principal) * 100);

  // Preview split for current entered amount
  const previewSplit = useMemo(() => {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0 || isClosed) return null;
    const interestDue = parseFloat((balance * monthlyRate).toFixed(2));
    const interestPaid = parseFloat(Math.min(amt, interestDue).toFixed(2));
    const principalPaid = parseFloat(Math.max(0, amt - interestDue).toFixed(2));
    const newBalance = parseFloat(Math.max(0, balance - principalPaid).toFixed(2));
    return { interestPaid, principalPaid, newBalance, interestDue };
  }, [payAmount, balance, monthlyRate, isClosed]);

  function addPayment(e) {
    e.preventDefault();
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) return;
    const newPayments = [
      ...(loan.payments || []),
      { id: Date.now().toString(36) + Math.random().toString(36).slice(2), amount: amt, date: payDate, note: payNote.trim(), paidBy: deviceProfile },
    ];
    updateItem('loans', loan.id, { payments: newPayments });
    setPayAmount(''); setPayNote(''); setPayDate(new Date().toISOString().split('T')[0]);
    addToast('Payment recorded');
    triggerRefresh();
  }

  function deletePayment() {
    const newPayments = (loan.payments || []).filter(p => p.id !== deletePayId);
    updateItem('loans', loan.id, { payments: newPayments });
    setDeletePayId(null);
    addToast('Payment deleted');
    triggerRefresh();
  }

  return (
    <div className="mt-3 border-t border-cream-200 dark:border-ink-600 pt-3">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-center text-xs">
        <div className="bg-cream-50 dark:bg-ink-600 rounded-lg py-1.5">
          <p className="text-ink-300 text-[10px] mb-0.5">Outstanding</p>
          <p className="font-bold text-red-500">{formatINR(balance)}</p>
        </div>
        <div className="bg-cream-50 dark:bg-ink-600 rounded-lg py-1.5">
          <p className="text-ink-300 text-[10px] mb-0.5">Principal Paid</p>
          <p className="font-bold text-green-600">{formatINR(totalPrincipalPaid)}</p>
        </div>
        <div className="bg-cream-50 dark:bg-ink-600 rounded-lg py-1.5">
          <p className="text-ink-300 text-[10px] mb-0.5">Interest Paid</p>
          <p className="font-bold text-orange-500">{formatINR(totalInterestPaid)}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="h-2 bg-cream-200 dark:bg-ink-600 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: isClosed ? '#10b981' : 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
        </div>
        <p className="text-right text-[10px] text-ink-300 mt-0.5">{Math.round(progress)}% principal repaid</p>
      </div>

      {/* Next month interest info */}
      {!isClosed && (
        <div className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded-lg px-3 py-1.5 mb-3">
          <Info className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Next month interest on ₹{balance.toLocaleString('en-IN')}: <strong>{formatINR(balance * monthlyRate)}</strong></span>
        </div>
      )}

      {/* Toggle history */}
      <button onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-ink-300 dark:text-ink-200 hover:text-brand-600 dark:hover:text-brand-400 transition-colors mb-2">
        <CreditCard className="w-3.5 h-3.5" />
        {rows.length > 0 ? `${rows.length} Payment${rows.length > 1 ? 's' : ''} — History` : 'Payment History'}
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="space-y-2">
          {/* Table header */}
          {rows.length > 0 && (
            <div className="grid text-[10px] font-semibold text-ink-300 px-2 mb-1"
              style={{ gridTemplateColumns: '80px 1fr 1fr 1fr 1fr 24px' }}>
              <span>Date</span>
              <span className="text-right">Paid</span>
              <span className="text-right">Interest</span>
              <span className="text-right">Principal</span>
              <span className="text-right">Balance</span>
              <span></span>
            </div>
          )}

          {rows.length === 0 && <p className="text-xs text-ink-300 italic">No payments recorded yet.</p>}

          {rows.map((row, idx) => {
            const isOwner = (row.paidBy || 'Muthu') === deviceProfile;
            return (
              <div key={row.id}
                className="grid items-center text-xs bg-cream-50 dark:bg-ink-700 rounded-lg px-2 py-2 gap-1"
                style={{ gridTemplateColumns: '80px 1fr 1fr 1fr 1fr 24px' }}>
                <span className="text-ink-300 text-[10px]">{formatDate(row.date)}</span>
                <span className="text-right font-semibold text-ink dark:text-cream-50">{formatINR(row.payment)}</span>
                <span className="text-right text-orange-500">{formatINR(row.interestPaid)}</span>
                <span className="text-right text-green-600">{formatINR(row.principalPaid)}</span>
                <span className="text-right font-medium text-brand-600 dark:text-brand-400">{formatINR(row.balance)}</span>
                {isOwner && canEdit ? (
                  <button onClick={() => setDeletePayId(row.id)} className="flex items-center justify-center p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <X className="w-3 h-3 text-red-400" />
                  </button>
                ) : <span />}
              </div>
            );
          })}

          {isClosed && (
            <p className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />Loan fully repaid! 🎉
            </p>
          )}

          {/* Add payment */}
          {!isClosed && (
            <form onSubmit={addPayment} className="space-y-2 pt-2 border-t border-cream-200 dark:border-ink-600">
              <div className="flex gap-2">
                <div className="flex-1">
                  <input type="number" placeholder="Amount paid (₹)" value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    className="input-base text-sm w-full" min="1" step="0.01" />
                </div>
                <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)}
                  className="input-base text-sm" style={{ width: 130 }} />
              </div>

              {/* Live split preview */}
              {previewSplit && (
                <div className="grid grid-cols-3 gap-1 text-[10px] text-center">
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg py-1.5 px-1">
                    <p className="text-ink-300 mb-0.5">Interest</p>
                    <p className="font-bold text-orange-500">{formatINR(previewSplit.interestPaid)}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg py-1.5 px-1">
                    <p className="text-ink-300 mb-0.5">Principal</p>
                    <p className="font-bold text-green-600">{formatINR(previewSplit.principalPaid)}</p>
                  </div>
                  <div className="bg-brand-50 dark:bg-brand-900/20 rounded-lg py-1.5 px-1">
                    <p className="text-ink-300 mb-0.5">New Balance</p>
                    <p className="font-bold text-brand-600 dark:text-brand-400">{formatINR(previewSplit.newBalance)}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <input type="text" placeholder="Note (optional)" value={payNote}
                  onChange={e => setPayNote(e.target.value)} className="input-base flex-1 text-sm" />
                <button type="submit" disabled={!payAmount || parseFloat(payAmount) <= 0}
                  className="p-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white transition-colors flex-shrink-0">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <ConfirmModal isOpen={!!deletePayId} onClose={() => setDeletePayId(null)} onConfirm={deletePayment}
        title="Delete Payment" message="Are you sure you want to delete this payment?" />
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

  const [loanName, setLoanName] = useState('');
  const [loanType, setLoanType] = useState('borrowed');
  const [personName, setPersonName] = useState('');
  const [principal, setPrincipal] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  const allLoans = useMemo(() => {
    let loans = getAll('loans');
    loans = filterByProfile(loans, viewFilter);
    return loans.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  }, [refreshKey, viewFilter]);

  const stats = useMemo(() => {
    let totalBorrowed = 0, totalLent = 0;
    allLoans.forEach(loan => {
      const { balance } = computeSchedule(loan);
      if (loan.loanType === 'borrowed') totalBorrowed += balance;
      else totalLent += balance;
    });
    return { totalBorrowed, totalLent, total: totalBorrowed + totalLent };
  }, [allLoans]);

  const items = useMemo(() => {
    let list = allLoans;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(l => (l.loanName || '').toLowerCase().includes(q) || (l.personName || '').toLowerCase().includes(q));
    }
    if (filterType) list = list.filter(l => l.loanType === filterType);
    return list;
  }, [allLoans, search, filterType]);

  function validate() {
    const errs = {};
    if (!loanName.trim()) errs.loanName = 'Loan name required';
    if (!personName.trim()) errs.personName = 'Person name required';
    if (!principal || isNaN(principal) || Number(principal) <= 0) errs.principal = 'Valid amount required';
    if (!interestRate || isNaN(interestRate) || Number(interestRate) < 0) errs.interestRate = 'Valid interest rate required';
    if (!startDate) errs.startDate = 'Start date required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!canEdit || !validate()) return;
    const data = {
      loanName: loanName.trim(), loanType, personName: personName.trim(),
      principal: parseFloat(principal), interestRate: parseFloat(interestRate),
      startDate, notes: notes.trim(),
      payments: editing?.payments || [],
    };
    if (editing) { updateItem('loans', editing.id, data); addToast('Loan updated'); }
    else { addItem('loans', data); addToast('Loan added'); }
    resetForm(); triggerRefresh();
  }

  function resetForm() {
    setShowForm(false); setEditing(null);
    setLoanName(''); setLoanType('borrowed'); setPersonName('');
    setPrincipal(''); setInterestRate('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setNotes(''); setErrors({});
  }

  function startEdit(loan) {
    setEditing(loan);
    setLoanName(loan.loanName || ''); setLoanType(loan.loanType || 'borrowed');
    setPersonName(loan.personName || ''); setPrincipal(String(loan.principal || ''));
    setInterestRate(String(loan.interestRate || ''));
    setStartDate(loan.startDate || new Date().toISOString().split('T')[0]);
    setNotes(loan.notes || '');
    setShowForm(true);
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Loans</h1>
          <p className="page-subtitle">Track borrowed &amp; lent money</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Loan
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card text-center py-3">
          <p className="text-xs text-ink-300 mb-1 flex items-center justify-center gap-1">
            <TrendingDown className="w-3 h-3 text-red-400" />Borrowed
          </p>
          <p className="text-lg font-bold text-red-500">{formatINR(stats.totalBorrowed)}</p>
          <p className="text-[10px] text-ink-300">I owe</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xs text-ink-300 mb-1 flex items-center justify-center gap-1">
            <TrendingUp className="w-3 h-3 text-green-500" />Lent
          </p>
          <p className="text-lg font-bold text-green-600">{formatINR(stats.totalLent)}</p>
          <p className="text-[10px] text-ink-300">Owed to me</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xs text-ink-300 mb-1 flex items-center justify-center gap-1">
            <Landmark className="w-3 h-3 text-brand-500" />Total
          </p>
          <p className="text-lg font-bold text-brand-600 dark:text-brand-400">{formatINR(stats.total)}</p>
          <p className="text-[10px] text-ink-300">Outstanding</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Search loans..." /></div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input-base sm:w-40">
          <option value="">All Types</option>
          <option value="borrowed">Borrowed</option>
          <option value="lent">Lent</option>
        </select>
      </div>

      {/* Loan cards */}
      {items.length === 0 ? (
        <EmptyState icon={Landmark} title="No loans" description="Track money you've borrowed or lent."
          action={canEdit ? <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" />Add Loan</button> : null} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((loan, i) => {
            const isBorrowed = loan.loanType === 'borrowed';
            const { balance, rows, totalInterestPaid } = computeSchedule(loan);
            const isClosed = balance <= 0;

            return (
              <div key={loan.id} className="card animate-slide-up" style={{ animationDelay: `${i * 40}ms`, borderLeft: `3px solid ${isBorrowed ? '#ef4444' : '#10b981'}` }}>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-ink dark:text-cream-50">{loan.loanName}</h3>
                      <span className={`badge text-[10px] ${isBorrowed ? 'badge-red' : 'badge-green'}`}>
                        {isBorrowed ? <TrendingDown className="w-3 h-3 mr-0.5" /> : <TrendingUp className="w-3 h-3 mr-0.5" />}
                        {isBorrowed ? 'Borrowed' : 'Lent'}
                      </span>
                      <StatusBadge balance={balance} />
                    </div>
                    <p className="text-xs text-ink-300 flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3" />{loan.personName}
                    </p>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => startEdit(loan)} className="p-1.5 rounded-lg hover:bg-cream-300 dark:hover:bg-ink-600 transition-colors">
                        <Edit3 className="w-3.5 h-3.5 text-ink-300" />
                      </button>
                      <button onClick={() => setDeleteId(loan.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Key info */}
                <div className="grid grid-cols-3 gap-2 mb-2 text-xs text-center">
                  <div className="bg-cream-50 dark:bg-ink-600 rounded-lg py-2">
                    <p className="text-ink-300 text-[10px] mb-0.5">Principal</p>
                    <p className="font-bold text-ink dark:text-cream-50">{formatINR(loan.principal)}</p>
                  </div>
                  <div className="bg-cream-50 dark:bg-ink-600 rounded-lg py-2">
                    <p className="text-ink-300 text-[10px] mb-0.5">Interest/Month</p>
                    <p className="font-bold text-orange-500">{loan.interestRate}%</p>
                  </div>
                  <div className="bg-cream-50 dark:bg-ink-600 rounded-lg py-2">
                    <p className="text-ink-300 text-[10px] mb-0.5">Started</p>
                    <p className="font-bold text-ink dark:text-cream-50 text-[10px]">{formatDate(loan.startDate)}</p>
                  </div>
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
          {/* Borrowed / Lent toggle */}
          <div className="grid grid-cols-2 gap-2">
            {['borrowed', 'lent'].map(t => (
              <button key={t} type="button" onClick={() => setLoanType(t)}
                className={`py-2.5 rounded-xl font-medium text-sm transition-all border ${loanType === t
                  ? t === 'borrowed' ? 'bg-red-500 text-white border-red-500' : 'bg-green-500 text-white border-green-500'
                  : 'bg-transparent text-ink-300 border-cream-300 dark:border-ink-500'}`}>
                {t === 'borrowed' ? '💸 I Borrowed' : '🤝 I Lent'}
              </button>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Loan Name</label>
            <input type="text" value={loanName} onChange={e => setLoanName(e.target.value)}
              className="input-base" placeholder="e.g. Personal Loan, Home Loan" />
            {errors.loanName && <p className="text-red-500 text-xs mt-1">{errors.loanName}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">
              {loanType === 'borrowed' ? 'Borrowed from' : 'Lent to'}
            </label>
            <input type="text" value={personName} onChange={e => setPersonName(e.target.value)}
              className="input-base" placeholder="Person / Bank name" />
            {errors.personName && <p className="text-red-500 text-xs mt-1">{errors.personName}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Principal Amount (₹)</label>
              <input type="number" value={principal} onChange={e => setPrincipal(e.target.value)}
                className="input-base" placeholder="e.g. 10000" min="1" />
              {errors.principal && <p className="text-red-500 text-xs mt-1">{errors.principal}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Monthly Interest (%)</label>
              <input type="number" value={interestRate} onChange={e => setInterestRate(e.target.value)}
                className="input-base" placeholder="e.g. 2.5" min="0" step="0.01" />
              {errors.interestRate && <p className="text-red-500 text-xs mt-1">{errors.interestRate}</p>}
            </div>
          </div>

          {/* Live interest preview */}
          {principal && interestRate && (
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 text-center">
              <p className="text-xs text-ink-300 mb-1">Monthly interest on ₹{Number(principal).toLocaleString('en-IN')}</p>
              <p className="text-xl font-bold text-orange-500">
                {formatINR(parseFloat(principal) * parseFloat(interestRate) / 100)}
              </p>
              <p className="text-[10px] text-ink-300 mt-1">Pay more than this to reduce principal</p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-base" />
            {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-ink dark:text-cream-50 mb-1 block">Notes (Optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              className="input-base min-h-[60px] resize-none" placeholder="Any details..." rows={2} />
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
