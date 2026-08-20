import { useState, useMemo, useEffect } from 'react';
import { getSalaryForMonth, getItemsForMonth, getAll, filterByProfile } from '../utils/storage';
import { formatINR, getCurrentMonthYear, formatMonthYear } from '../utils/formatters';
// NEW: Import downloadDateWisePDF
import { downloadMonthlyPDF, getMonthlyPDFBlob, downloadDateWisePDF } from '../utils/pdf';
import { shareFile, isShareAvailable } from '../utils/share';
import { useApp } from '../contexts/AppContext';
import MonthPicker from '../components/ui/MonthPicker';
import { BarChart3, FileDown, Share2, Download, FileText } from 'lucide-react';

export default function Reports() {
  const { year: curYear, month: curMonth } = getCurrentMonthYear();
  const [selectedYear, setSelectedYear] = useState(curYear);
  const [pdfYear, setPdfYear] = useState(curYear);
  const [pdfMonth, setPdfMonth] = useState(curMonth);
  const { addToast, refreshKey, viewFilter, setViewFilter } = useApp();
  const [canShare, setCanShare] = useState(false);

  useEffect(() => { isShareAvailable().then(setCanShare); }, []);

  const yearlyData = useMemo(() => {
    const months = [];
    for (let m = 0; m < 12; m++) {
      if (selectedYear === curYear && m > curMonth) break;
      const allSalaries = getAll('salary');
      const salaryForMonth = allSalaries.filter(s => {
        const d = new Date(s.effectiveFrom);
        return d.getFullYear() === selectedYear && d.getMonth() === m;
      });
      let salary;
      if (viewFilter === 'Family') {
        salary = salaryForMonth.reduce((sum, s) => sum + Number(s.amount), 0);
        if (salary === 0) salary = getSalaryForMonth(selectedYear, m);
      } else {
        const mine = salaryForMonth.filter(s => (s.addedBy || 'Muthu') === viewFilter);
        salary = mine.length > 0 ? Number(mine[0].amount) : 0;
      }
      let income = getItemsForMonth('income', selectedYear, m);
      let expenses = getItemsForMonth('expenses', selectedYear, m);
      let savings = getItemsForMonth('savings', selectedYear, m);

      income = filterByProfile(income, viewFilter);
      expenses = filterByProfile(expenses, viewFilter);
      savings = filterByProfile(savings, viewFilter);

      const totalIncome = salary + income.reduce((s, i) => s + Number(i.amount), 0);
      const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
      const deposits = savings.filter((s) => s.type === 'deposit').reduce((s, i) => s + Number(i.amount), 0);
      const withdrawals = savings.filter((s) => s.type === 'withdrawal').reduce((s, i) => s + Number(i.amount), 0);
      const netSavings = deposits - withdrawals;

      const monthLabel = new Date(selectedYear, m, 1).toLocaleDateString('en-IN', { month: 'short' });
      months.push({
        month: monthLabel,
        salary,
        totalIncome,
        totalExpenses,
        netSavings,
        remaining: totalIncome - totalExpenses - netSavings,
      });
    }
    return months;
  }, [selectedYear, refreshKey, curYear, curMonth, viewFilter]);

  const totals = yearlyData.reduce(
    (acc, m) => ({
      salary: acc.salary + m.salary,
      totalIncome: acc.totalIncome + m.totalIncome,
      totalExpenses: acc.totalExpenses + m.totalExpenses,
      netSavings: acc.netSavings + m.netSavings,
      remaining: acc.remaining + m.remaining,
    }),
    { salary: 0, totalIncome: 0, totalExpenses: 0, netSavings: 0, remaining: 0 }
  );

  async function handleExportCSV() {
    const headers = ['Month', 'Salary', 'Total Income', 'Total Expenses', 'Net Savings', 'Remaining Balance'];
    const rows = yearlyData.map((m) => [m.month, m.salary, m.totalIncome, m.totalExpenses, m.netSavings, m.remaining]);
    rows.push(['Total', totals.salary, totals.totalIncome, totals.totalExpenses, totals.netSavings, totals.remaining]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const fileName = `Muthu_Report_${selectedYear}.csv`;
    const ok = await shareFile('Muthu Yearly CSV', blob, fileName, 'text/csv');
    if (ok) addToast('CSV exported successfully');
  }

  function handlePDFDownload() {
    downloadMonthlyPDF(pdfYear, pdfMonth);
    addToast('Detailed Report Generated');
  }

  // NEW: Date-wise Ledger Download Handler
  function handleDateWisePDFDownload() {
    downloadDateWisePDF(pdfYear, pdfMonth);
    addToast('Date-wise Ledger Generated');
  }

  return (
    <div className="page-container">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Export your financial data</p>
        </div>
        
        {/* Profile Filter Toggle */}
        <div className="bg-black/5 dark:bg-white/5 p-1 rounded-xl flex items-center gap-1 self-start sm:self-auto backdrop-blur-md">
          {['Family', 'Muthu', 'Abi'].map((filter) => (
            <button
              key={filter}
              onClick={() => setViewFilter(filter)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
                viewFilter === filter
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-white shadow-sm'
                  : 'text-ink-400 dark:text-slate-400 hover:text-ink dark:hover:text-white'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Premium PDF Export Section */}
      <div className="card mb-6 border border-brand-500/20 bg-gradient-to-br from-white/80 to-brand-50/30 dark:from-slate-800/40 dark:to-brand-900/10">
        <h2 className="flex items-center gap-2 section-title text-brand-600 dark:text-brand-400">
          <FileDown className="w-5 h-5" /> Export PDF Reports
        </h2>
        <p className="text-xs text-ink-300 dark:text-slate-400 mb-5">Select a month and download your data in professional PDF formats.</p>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4 pb-4 border-b border-ink-50 dark:border-white/5">
          <MonthPicker year={pdfYear} month={pdfMonth} onChange={(y, m) => { setPdfYear(y); setPdfMonth(m); }} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Detailed Report Button */}
          <button onClick={handlePDFDownload} className="btn-secondary w-full justify-start text-left flex-col items-start p-4 h-auto">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-brand-500" />
              <span className="font-bold">Detailed Summary</span>
            </div>
            <span className="text-[10px] text-ink-300 dark:text-slate-400 font-normal">Includes category breakdown & budgets.</span>
          </button>

          {/* NEW: Date-wise Ledger Button */}
          <button onClick={handleDateWisePDFDownload} className="btn-primary w-full justify-start text-left flex-col items-start p-4 h-auto bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 shadow-[0_4px_20px_rgba(16,185,129,0.3)]">
            <div className="flex items-center gap-2 mb-1 text-white">
              <FileText className="w-4 h-4" />
              <span className="font-bold">Date-wise Ledger</span>
            </div>
            <span className="text-[10px] text-emerald-50 font-normal">Chronological list of all income & expenses.</span>
          </button>
        </div>
      </div>

      {/* Yearly Breakdown */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-0">Yearly Breakdown — {selectedYear}</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedYear((y) => y - 1)} className="btn-secondary text-xs px-3 py-1.5 rounded-lg">← {selectedYear - 1}</button>
            {selectedYear < curYear && (
              <button onClick={() => setSelectedYear((y) => y + 1)} className="btn-secondary text-xs px-3 py-1.5 rounded-lg">{selectedYear + 1} →</button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto -mx-4 sm:-mx-5 px-4 sm:px-5 pb-2 scrollbar-thin">
          <table className="w-full text-xs min-w-[600px]">
            <thead>
              <tr className="border-b border-ink-50 dark:border-white/10">
                <th className="text-left py-3 font-semibold text-ink-400 dark:text-slate-400">Month</th>
                <th className="text-right py-3 font-semibold text-ink-400 dark:text-slate-400">Salary</th>
                <th className="text-right py-3 font-semibold text-ink-400 dark:text-slate-400">Income</th>
                <th className="text-right py-3 font-semibold text-ink-400 dark:text-slate-400">Expenses</th>
                <th className="text-right py-3 font-semibold text-ink-400 dark:text-slate-400">Savings</th>
                <th className="text-right py-3 font-semibold text-ink-400 dark:text-slate-400">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {yearlyData.map((m) => (
                <tr key={m.month} className="border-b border-ink-50/50 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <td className="py-3 font-bold text-ink dark:text-white">{m.month}</td>
                  <td className="py-3 text-right currency">{formatINR(m.salary)}</td>
                  <td className="py-3 text-right currency text-emerald-600 dark:text-emerald-400">{formatINR(m.totalIncome)}</td>
                  <td className="py-3 text-right currency text-rose-500 dark:text-rose-400">{formatINR(m.totalExpenses)}</td>
                  <td className="py-3 text-right currency text-blue-600 dark:text-blue-400">{formatINR(m.netSavings)}</td>
                  <td className={`py-3 text-right currency font-bold ${m.remaining < 0 ? 'text-rose-500 dark:text-rose-400' : 'text-ink dark:text-white'}`}>{formatINR(m.remaining)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ink-100 dark:border-white/20 font-bold">
                <td className="py-3 text-ink dark:text-white">Total</td>
                <td className="py-3 text-right currency">{formatINR(totals.salary)}</td>
                <td className="py-3 text-right currency text-emerald-600 dark:text-emerald-400">{formatINR(totals.totalIncome)}</td>
                <td className="py-3 text-right currency text-rose-500 dark:text-rose-400">{formatINR(totals.totalExpenses)}</td>
                <td className="py-3 text-right currency text-blue-600 dark:text-blue-400">{formatINR(totals.netSavings)}</td>
                <td className={`py-3 text-right currency ${totals.remaining < 0 ? 'text-rose-500 dark:text-rose-400' : 'text-ink dark:text-white'}`}>{formatINR(totals.remaining)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <button onClick={handleExportCSV} className="btn-secondary w-full sm:w-auto text-xs mt-4">
          <Download className="w-4 h-4" /> Export CSV (Excel)
        </button>
      </div>
    </div>
  );
}
