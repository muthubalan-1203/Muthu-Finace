import { useState, useMemo, useEffect } from 'react';
import { getSalaryForMonth, getItemsForMonth, getAll, filterByProfile } from '../utils/storage';
import { formatINR, getCurrentMonthYear, formatMonthYear } from '../utils/formatters';
import { downloadMonthlyPDF, getMonthlyPDFBlob } from '../utils/pdf';
import { shareFile, isShareAvailable } from '../utils/share';
import { useApp } from '../contexts/AppContext';
import MonthPicker from '../components/ui/MonthPicker';
import { BarChart3, FileDown, Share2, Download } from 'lucide-react';

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
      // Salary per profile
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
    addToast('PDF downloaded');
  }

  async function handleSharePDF() {
    const blob = getMonthlyPDFBlob(pdfYear, pdfMonth);
    const monthLabel = formatMonthYear(pdfYear, pdfMonth).replace(/\s+/g, '_');
    const fileName = `Muthu_Report_${monthLabel}.pdf`;
    const ok = await shareFile('Muthu Monthly Report', blob, fileName, 'application/pdf');
    if (ok) addToast('Report shared');
  }

  return (
    <div className="page-container">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Yearly overview & monthly PDF</p>
        </div>
        
        {/* Profile Filter Toggle */}
        <div className="bg-ink-100 dark:bg-ink-800 p-1 rounded-lg flex items-center gap-1 self-start sm:self-auto">
          {['Family', 'Muthu', 'Abi'].map((filter) => (
            <button
              key={filter}
              onClick={() => setViewFilter(filter)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewFilter === filter
                  ? 'bg-white dark:bg-ink-600 text-ink dark:text-cream-50 shadow-sm'
                  : 'text-ink-400 dark:text-ink-300 hover:text-ink dark:hover:text-cream-100'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Monthly PDF Report Section */}
      <div className="card mb-6">
        <h2 className="section-title">Monthly PDF Report</h2>
        <p className="text-xs text-ink-300 dark:text-ink-200 mb-4">Generate a detailed, shareable PDF report for any month.</p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <MonthPicker year={pdfYear} month={pdfMonth} onChange={(y, m) => { setPdfYear(y); setPdfMonth(m); }} />
          <div className="flex gap-2">
            <button onClick={handlePDFDownload} className="btn-primary text-xs">
              <FileDown className="w-4 h-4" /> Download PDF
            </button>
            {canShare && (
              <button onClick={handleSharePDF} className="btn-secondary text-xs">
                <Share2 className="w-4 h-4" /> Share
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Yearly Breakdown */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-0">Yearly Breakdown — {selectedYear}</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedYear((y) => y - 1)} className="btn-secondary text-xs px-3 py-1.5">← {selectedYear - 1}</button>
            {selectedYear < curYear && (
              <button onClick={() => setSelectedYear((y) => y + 1)} className="btn-secondary text-xs px-3 py-1.5">{selectedYear + 1} →</button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto -mx-4 sm:-mx-5 px-4 sm:px-5">
          <table className="w-full text-xs min-w-[600px]">
            <thead>
              <tr className="border-b border-ink-50 dark:border-ink-600">
                <th className="text-left py-2 font-semibold text-ink-400 dark:text-ink-200">Month</th>
                <th className="text-right py-2 font-semibold text-ink-400 dark:text-ink-200">Salary</th>
                <th className="text-right py-2 font-semibold text-ink-400 dark:text-ink-200">Income</th>
                <th className="text-right py-2 font-semibold text-ink-400 dark:text-ink-200">Expenses</th>
                <th className="text-right py-2 font-semibold text-ink-400 dark:text-ink-200">Savings</th>
                <th className="text-right py-2 font-semibold text-ink-400 dark:text-ink-200">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {yearlyData.map((m) => (
                <tr key={m.month} className="border-b border-ink-50/50 dark:border-ink-700/50 hover:bg-cream-100 dark:hover:bg-ink-700/50 transition-colors">
                  <td className="py-2.5 font-medium text-ink dark:text-cream-50">{m.month}</td>
                  <td className="py-2.5 text-right currency">{formatINR(m.salary)}</td>
                  <td className="py-2.5 text-right currency text-emerald-600">{formatINR(m.totalIncome)}</td>
                  <td className="py-2.5 text-right currency text-red-500">{formatINR(m.totalExpenses)}</td>
                  <td className="py-2.5 text-right currency text-blue-500">{formatINR(m.netSavings)}</td>
                  <td className={`py-2.5 text-right currency font-medium ${m.remaining < 0 ? 'text-red-500' : 'text-ink dark:text-cream-50'}`}>{formatINR(m.remaining)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ink-100 dark:border-ink-500 font-semibold">
                <td className="py-2.5 text-ink dark:text-cream-50">Total</td>
                <td className="py-2.5 text-right currency">{formatINR(totals.salary)}</td>
                <td className="py-2.5 text-right currency text-emerald-600">{formatINR(totals.totalIncome)}</td>
                <td className="py-2.5 text-right currency text-red-500">{formatINR(totals.totalExpenses)}</td>
                <td className="py-2.5 text-right currency text-blue-500">{formatINR(totals.netSavings)}</td>
                <td className={`py-2.5 text-right currency ${totals.remaining < 0 ? 'text-red-500' : 'text-ink dark:text-cream-50'}`}>{formatINR(totals.remaining)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <button onClick={handleExportCSV} className="btn-secondary text-xs mt-4">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>
    </div>
  );
}
