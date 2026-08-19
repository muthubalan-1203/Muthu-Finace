import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { getSalaryForMonth, getItemsForMonth, getAll, filterByProfile } from '../utils/storage';
import { formatINR, getCurrentMonthYear, formatMonthYear } from '../utils/formatters';
import { downloadMonthlyPDF, getMonthlyPDFBlob } from '../utils/pdf';
import { shareText, shareFile, isShareAvailable, formatDashboardShareText } from '../utils/share';
import MonthPicker from '../components/ui/MonthPicker';
import Modal from '../components/ui/Modal';
import ReviewWizard from '../components/ReviewWizard';
import { getSettings } from '../utils/storage';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts';
import {
  Wallet, TrendingUp, TrendingDown, PiggyBank, Scale, ShieldCheck,
  FileDown, Share2, PartyPopper,
} from 'lucide-react';

const COLORS = ['#0F6E5E', '#17B890', '#2DD4BF', '#5EEAD4', '#99F6E4', '#CCFBF1', '#0D9488', '#14B8A6', '#A7F3D0', '#6EE7B7'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  if (h < 20) return 'Good Evening';
  return 'Good Night';
}

export default function Dashboard() {
  const { year: curYear, month: curMonth } = getCurrentMonthYear();
  const [year, setYear] = useState(curYear);
  const [month, setMonth] = useState(curMonth);
  const { addToast, refreshKey, viewFilter, setViewFilter, profileName } = useApp();
  const [canShare, setCanShare] = useState(false);
  
  const [reminders, setReminders] = useState([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showReviewWizard, setShowReviewWizard] = useState(false);
  const [needsReview, setNeedsReview] = useState(false);

  useEffect(() => {
    isShareAvailable().then(setCanShare);
  }, []);

  useEffect(() => {
    const allEvents = filterByProfile(getAll('events'), viewFilter);
    const today = new Date();
    const tMonth = today.getMonth();
    const tYear = today.getFullYear();
    const tDate = today.getDate();
    const todayString = today.toISOString().split('T')[0];

    let todayEvents = allEvents.filter(ev => {
      const d = new Date(ev.date);
      if (ev.isAnnual) {
        return d.getMonth() === tMonth && d.getDate() === tDate;
      }
      return d.getFullYear() === tYear && d.getMonth() === tMonth && d.getDate() === tDate;
    });

    // Check for salary day
    const salaryItems = filterByProfile(getAll('salary'), viewFilter);
    const applicableSalary = salaryItems
      .sort((a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom))
      .find(s => {
        const d = new Date(s.effectiveFrom);
        return d.getFullYear() < tYear || (d.getFullYear() === tYear && d.getMonth() <= tMonth);
      });

    if (applicableSalary && applicableSalary.salaryDay && Number(applicableSalary.salaryDay) === tDate) {
      todayEvents.push({
        id: 'salary-' + todayString,
        title: 'Salary Credited',
        isAnnual: false
      });
    }

    if (todayEvents.length > 0) {
      const lastShown = localStorage.getItem('last_reminder_shown');
      if (lastShown !== todayString) {
        setReminders(todayEvents);
        setShowReminderModal(true);
        localStorage.setItem('last_reminder_shown', todayString);
      }
    }

    // Review Wizard logic
    const settings = getSettings();
    if (settings.reviewMeetingDate) {
      const reviewDate = Number(settings.reviewMeetingDate);
      if (tDate >= reviewDate) {
        const currentMonthStr = `${tYear}-${tMonth}`;
        if (settings.lastReviewDone !== currentMonthStr) {
          setNeedsReview(true);
        } else {
          setNeedsReview(false);
        }
      } else {
        setNeedsReview(false);
      }
    }
  }, [viewFilter, refreshKey]);

  const data = useMemo(() => {
    // Get salary for the selected month filtered by profile
    const salaryItems = getAll('salary');
    const salaryForMonth = salaryItems.filter(s => {
      const d = new Date(s.effectiveFrom);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    let salary;
    if (viewFilter === 'Family') {
      // Family: Sum ALL salaries for the month (Muthu + Abi)
      salary = salaryForMonth.reduce((sum, s) => sum + Number(s.amount), 0);
      // Fallback: if no salary for this specific month, use getSalaryForMonth
      if (salary === 0) salary = getSalaryForMonth(year, month);
    } else {
      // Individual: only this person's salary for the month
      const mine = salaryForMonth.filter(s => (s.addedBy || 'Muthu') === viewFilter);
      salary = mine.length > 0 ? Number(mine[0].amount) : 0;
    }

    let incomeItems = getItemsForMonth('income', year, month);
    let expenseItems = getItemsForMonth('expenses', year, month);
    let savingsItems = getItemsForMonth('savings', year, month);

    incomeItems = filterByProfile(incomeItems, viewFilter);
    expenseItems = filterByProfile(expenseItems, viewFilter);
    savingsItems = filterByProfile(savingsItems, viewFilter);

    const budgets = getAll('budgets');

    const totalNonSalaryIncome = incomeItems.reduce((s, i) => s + Number(i.amount), 0);
    const totalIncome = salary + totalNonSalaryIncome;
    const totalExpenses = expenseItems.reduce((s, e) => s + Number(e.amount), 0);
    const savingsDeposits = savingsItems.filter((s) => s.type === 'deposit').reduce((s, i) => s + Number(i.amount), 0);
    const savingsWithdrawals = savingsItems.filter((s) => s.type === 'withdrawal').reduce((s, i) => s + Number(i.amount), 0);
    const netSavings = savingsDeposits - savingsWithdrawals;
    const remainingBalance = totalIncome - totalExpenses - netSavings;

    // Trailing 6 months data
    const trailing = [];
    for (let i = 5; i >= 0; i--) {
      let tm = month - i;
      let ty = year;
      while (tm < 0) { tm += 12; ty -= 1; }
      
      const tSalaryItems = salaryItems.filter(s => {
        const d = new Date(s.effectiveFrom);
        return d.getFullYear() === ty && d.getMonth() === tm;
      });
      let tSal;
      if (viewFilter === 'Family') {
        tSal = tSalaryItems.reduce((sum, s) => sum + Number(s.amount), 0);
        if (tSal === 0) tSal = getSalaryForMonth(ty, tm);
      } else {
        const mine = tSalaryItems.filter(s => (s.addedBy || 'Muthu') === viewFilter);
        tSal = mine.length > 0 ? Number(mine[0].amount) : 0;
      }

      const tIncItems = filterByProfile(getItemsForMonth('income', ty, tm), viewFilter);
      const tExpItems = filterByProfile(getItemsForMonth('expenses', ty, tm), viewFilter);

      const inc = tSal + tIncItems.reduce((s, x) => s + Number(x.amount), 0);
      const exp = tExpItems.reduce((s, x) => s + Number(x.amount), 0);
      const label = new Date(ty, tm, 1).toLocaleDateString('en-IN', { month: 'short' });
      trailing.push({ name: label, income: inc, expenses: exp, savings: inc - exp });
    }

    // Expense categories
    const catMap = {};
    expenseItems.forEach((e) => {
      const cat = e.category || 'Other';
      catMap[cat] = (catMap[cat] || 0) + Number(e.amount);
    });
    const categories = Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    // Budget usage
    const budgetUsage = budgets.map((b) => {
      const spent = expenseItems.filter((e) => e.category === b.category).reduce((s, e) => s + Number(e.amount), 0);
      const limit = Number(b.limit);
      const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
      let status = 'on-track';
      if (pct >= 100) status = 'over-budget';
      else if (pct >= 80) status = 'near-limit';
      return { category: b.category, spent, limit, pct, status };
    });

    return { salary, totalIncome, totalExpenses, netSavings, remainingBalance, trailing, categories, budgetUsage };
  }, [year, month, refreshKey, viewFilter]);

  const handleDownloadPDF = async () => {
    await downloadMonthlyPDF(year, month);
    addToast('PDF report generated');
  };

  const handleShare = async () => {
    const monthLabel = formatMonthYear(year, month);
    const text = formatDashboardShareText(
      monthLabel,
      formatINR(data.salary),
      formatINR(data.totalIncome),
      formatINR(data.totalExpenses),
      formatINR(data.remainingBalance)
    );
    const ok = await shareText('Muthu Monthly Summary', text);
    if (ok) addToast('Shared successfully');
  };

  const summaryCards = [
    { label: 'Salary', value: data.salary, icon: Wallet, color: 'text-brand-600' },
    { label: 'Total Income', value: data.totalIncome, icon: TrendingUp, color: 'text-emerald-600' },
    { label: 'Total Expenses', value: data.totalExpenses, icon: TrendingDown, color: 'text-red-500' },
    { label: 'Savings (Net)', value: data.netSavings, icon: PiggyBank, color: 'text-blue-500' },
    { label: 'Remaining', value: data.remainingBalance, icon: Scale, color: 'text-purple-500' },
  ];

  const tooltipStyle = {
    backgroundColor: 'rgba(11,18,16,0.9)',
    border: 'none',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#fff',
  };

  return (
    <div className="page-container">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title text-2xl font-black bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            {getGreeting()}, {profileName || 'User'}! 👋
          </h1>
          <p className="text-sm text-ink-300 dark:text-ink-200 mt-1">Here's your financial overview</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-6">
        <button onClick={handleDownloadPDF} className="btn-primary text-xs">
          <FileDown className="w-4 h-4" /> PDF Report
        </button>
        {canShare && (
          <button onClick={handleShare} className="btn-secondary text-xs">
            <Share2 className="w-4 h-4" /> Share
          </button>
        )}
      </div>

      {/* Review Wizard Prompt */}
      {needsReview && (
        <div className="mb-6 bg-gradient-to-r from-brand-600 to-brand-800 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 text-white animate-pop-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <PartyPopper className="w-5 h-5 text-cream-50" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Monthly Review Time!</h3>
              <p className="text-brand-100 text-sm">It's time to sit together and review last month's finances.</p>
            </div>
          </div>
          <button onClick={() => setShowReviewWizard(true)} className="bg-white text-brand-700 px-5 py-2 rounded-xl font-bold text-sm shadow-sm hover:bg-cream-50 transition-colors whitespace-nowrap">
            Start Review
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {summaryCards.map((card, i) => (
          <div key={card.label} className="card animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`w-4 h-4 ${card.color}`} />
              <span className="text-xs text-ink-300 dark:text-ink-200 font-medium">{card.label}</span>
            </div>
            <p className={`currency text-lg font-bold ${card.value < 0 ? 'text-red-500' : 'text-ink dark:text-cream-50'}`}>
              {formatINR(card.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Income vs Expenses - Bar Chart */}
        <div className="card">
          <h3 className="section-title">Income vs Expenses</h3>
          <p className="text-xs text-ink-300 dark:text-ink-200 mb-3">Trailing 6 months</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.trailing} barGap={4}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={45} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatINR(v)} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="income" name="Income" fill="#17B890" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Savings - Area Chart */}
        <div className="card">
          <h3 className="section-title">Monthly Savings Capacity</h3>
          <p className="text-xs text-ink-300 dark:text-ink-200 mb-3">Income − Expenses (trailing 6 months)</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trailing}>
                <defs>
                  <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#17B890" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#17B890" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={45} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatINR(v)} />
                <Area type="monotone" dataKey="savings" name="Savings" stroke="#17B890" strokeWidth={2} fill="url(#savingsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Categories - Sleek List */}
        <div className="card">
          <h3 className="section-title">Expense Categories 💸</h3>
          <p className="text-xs text-ink-300 dark:text-ink-200 mb-4">This month breakdown</p>
          {data.categories.length > 0 ? (
            <div className="space-y-4">
              {data.categories.map((cat, i) => {
                const pct = data.totalExpenses > 0 ? Math.round((cat.value / data.totalExpenses) * 100) : 0;
                return (
                  <div key={cat.name} className="animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-ink-400 dark:text-ink-100 font-medium truncate">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] text-ink-300 dark:text-ink-400 font-medium">{pct}%</span>
                        <span className="currency text-ink dark:text-cream-50 font-bold">{formatINR(cat.value)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-cream-200 dark:bg-ink-700 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-ink-300 dark:text-ink-200 text-center py-8">No expenses this month</p>
          )}
        </div>

        {/* Budget Usage - Progress Bars */}
        <div className="card">
          <h3 className="section-title">Budget Usage</h3>
          <p className="text-xs text-ink-300 dark:text-ink-200 mb-3">This month spending vs limits</p>
          {data.budgetUsage.length > 0 ? (
            <div className="space-y-3">
              {data.budgetUsage.map((b) => (
                <div key={b.category}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-ink-400 dark:text-ink-200 truncate">{b.category}</span>
                    <span className="currency text-ink dark:text-cream-50 flex-shrink-0 ml-2">
                      {formatINR(b.spent)} / {formatINR(b.limit)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-cream-300 dark:bg-ink-600 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        b.status === 'over-budget' ? 'bg-red-500' : b.status === 'near-limit' ? 'bg-amber-500' : 'bg-brand-500'
                      }`}
                      style={{ width: `${Math.min(b.pct, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className={`text-[10px] font-medium ${
                      b.status === 'over-budget' ? 'text-red-500' : b.status === 'near-limit' ? 'text-amber-500' : 'text-brand-500'
                    }`}>
                      {b.pct}% used
                    </span>
                    <span className={`badge text-[10px] ${
                      b.status === 'over-budget' ? 'badge-red' : b.status === 'near-limit' ? 'badge-amber' : 'badge-green'
                    }`}>
                      {b.status === 'over-budget' ? 'Over Budget' : b.status === 'near-limit' ? 'Near Limit' : 'On Track'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-300 dark:text-ink-200 text-center py-8">No budgets set</p>
          )}
        </div>
      </div>

      <Modal isOpen={showReminderModal} onClose={() => setShowReminderModal(false)} title="Today's Reminders">
        <div className="space-y-4">
          <div className="flex justify-center mb-2">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center animate-bounce">
              <PartyPopper className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="text-center space-y-3">
            {reminders.map((r) => (
              <p key={r.id} className="text-lg font-medium text-ink dark:text-cream-50">
                {r.title}
                {r.isAnnual && <span className="block text-sm text-ink-300 font-normal mt-1">Annual Reminder</span>}
              </p>
            ))}
          </div>
          <div className="pt-4">
            <button onClick={() => setShowReminderModal(false)} className="btn-primary w-full justify-center">
              Got it!
            </button>
          </div>
        </div>
      </Modal>

      {showReviewWizard && (
        <ReviewWizard onClose={() => setShowReviewWizard(false)} />
      )}
    </div>
  );
}
