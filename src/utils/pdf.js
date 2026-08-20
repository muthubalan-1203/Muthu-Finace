import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { shareFile } from './share';
import { formatINR, formatDate, formatMonthYear } from './formatters';
import { getSalaryForMonth, getItemsForMonth, getAll, getSettings } from './storage';

const BRAND_COLOR = [15, 110, 94];
const BRAND_LIGHT = [23, 184, 144];
const WHITE = [255, 255, 255];
const LIGHT_GRAY = [245, 245, 240];
const DARK_TEXT = [11, 18, 16];

export function generateMonthlyPDF(year, month) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const settings = getSettings();
  const profileName = settings.profileName || '';
  const monthLabel = formatMonthYear(year, month);

  const salary = getSalaryForMonth(year, month);
  const incomeItems = getItemsForMonth('income', year, month);
  const expenseItems = getItemsForMonth('expenses', year, month);
  const savingsItems = getItemsForMonth('savings', year, month);
  const budgets = getAll('budgets');
  const bills = getAll('bills').filter((b) => {
    const d = new Date(b.dueDate);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const totalIncome = salary + incomeItems.reduce((sum, i) => sum + Number(i.amount), 0);
  const totalExpenses = expenseItems.reduce((sum, e) => sum + Number(e.amount), 0);
  const savingsDeposits = savingsItems
    .filter((s) => s.type === 'deposit')
    .reduce((sum, s) => sum + Number(s.amount), 0);
  const savingsWithdrawals = savingsItems
    .filter((s) => s.type === 'withdrawal')
    .reduce((sum, s) => sum + Number(s.amount), 0);
  const netSavings = savingsDeposits - savingsWithdrawals;
  const remainingBalance = totalIncome - totalExpenses - netSavings;

  const allTimeSavings = getAll('savings').reduce((sum, s) => {
    const amt = Number(s.amount);
    return s.type === 'deposit' ? sum + amt : sum - amt;
  }, 0);

  let y = 0;

  function addHeader() {
    doc.setFillColor(...BRAND_COLOR);
    doc.rect(0, 0, pageWidth, 32, 'F');
    doc.setFillColor(...BRAND_LIGHT);
    doc.rect(0, 30, pageWidth, 3, 'F');

    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Muthu', 14, 14);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Personal Finance Report', 14, 20);
    doc.setFontSize(11);
    doc.text(monthLabel, pageWidth - 14, 14, { align: 'right' });
    if (profileName) {
      doc.setFontSize(9);
      doc.text(`Prepared for ${profileName}`, pageWidth - 14, 20, { align: 'right' });
    }
    y = 40;
  }

  function addFooter(pageNum, totalPages) {
    const footerY = doc.internal.pageSize.getHeight() - 8;
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated on ${new Date().toLocaleString('en-IN')}`,
      14,
      footerY
    );
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 14, footerY, {
      align: 'right',
    });
  }

  function checkPageBreak(needed) {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + needed > pageHeight - 20) {
      doc.addPage();
      y = 15;
    }
  }

  function sectionTitle(title) {
    checkPageBreak(15);
    doc.setFontSize(12);
    doc.setTextColor(...BRAND_COLOR);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, y);
    y += 2;
    doc.setDrawColor(...BRAND_LIGHT);
    doc.setLineWidth(0.5);
    doc.line(14, y, pageWidth - 14, y);
    y += 6;
  }

  addHeader();

  // 1. Summary Table
  sectionTitle('Summary');
  doc.autoTable({
    startY: y,
    head: [['Metric', 'Amount']],
    body: [
      ['Salary', formatINR(salary)],
      ['Total Income', formatINR(totalIncome)],
      ['Total Expenses', formatINR(totalExpenses)],
      ['Savings This Month (Net)', formatINR(netSavings)],
      ['Remaining Balance', formatINR(remainingBalance)],
      ['Total Savings (All Time)', formatINR(allTimeSavings)],
    ],
    theme: 'grid',
    headStyles: { fillColor: BRAND_COLOR, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: DARK_TEXT },
    alternateRowStyles: { fillColor: LIGHT_GRAY },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 10;

  // 2. Income — Day by Day
  sectionTitle('Income — Day by Day');
  if (incomeItems.length > 0) {
    const incomeRows = incomeItems
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((i) => [formatDate(i.date), i.source || '-', i.category || '-', formatINR(i.amount)]);
    incomeRows.push([
      { content: 'Total', colSpan: 3, styles: { fontStyle: 'bold' } },
      { content: formatINR(incomeItems.reduce((s, i) => s + Number(i.amount), 0)), styles: { fontStyle: 'bold' } },
    ]);
    if (salary > 0) {
      incomeRows.unshift([{ content: `Note: Salary (${formatINR(salary)}) is shown in Summary above`, colSpan: 4, styles: { fontStyle: 'italic', textColor: [100, 100, 100] } }]);
    }
    doc.autoTable({
      startY: y,
      head: [['Date', 'Source', 'Category', 'Amount']],
      body: incomeRows,
      theme: 'grid',
      headStyles: { fillColor: BRAND_COLOR, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8, textColor: DARK_TEXT },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 10;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('No income entries for this month.', 14, y);
    y += 10;
  }

  // 3. Expenses — Day by Day
  sectionTitle('Expenses — Day by Day');
  if (expenseItems.length > 0) {
    const expenseRows = expenseItems
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((e) => [formatDate(e.date), e.title || '-', e.category || '-', e.paymentMethod || '-', formatINR(e.amount)]);
    expenseRows.push([
      { content: 'Total', colSpan: 4, styles: { fontStyle: 'bold' } },
      { content: formatINR(totalExpenses), styles: { fontStyle: 'bold' } },
    ]);
    doc.autoTable({
      startY: y,
      head: [['Date', 'Title', 'Category', 'Payment Method', 'Amount']],
      body: expenseRows,
      theme: 'grid',
      headStyles: { fillColor: BRAND_COLOR, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8, textColor: DARK_TEXT },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 10;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('No expense entries for this month.', 14, y);
    y += 10;
  }

  // 4. Expenses by Category
  sectionTitle('Expenses by Category');
  if (expenseItems.length > 0) {
    const catMap = {};
    expenseItems.forEach((e) => {
      const cat = e.category || 'Uncategorized';
      catMap[cat] = (catMap[cat] || 0) + Number(e.amount);
    });
    const catRows = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => [cat, formatINR(amt), `${Math.round((amt / totalExpenses) * 100)}%`]);
    doc.autoTable({
      startY: y,
      head: [['Category', 'Amount', '% of Total']],
      body: catRows,
      theme: 'grid',
      headStyles: { fillColor: BRAND_COLOR, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8, textColor: DARK_TEXT },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 10;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('No expenses to categorize.', 14, y);
    y += 10;
  }

  // 5. Budget Status
  sectionTitle('Budget Status');
  if (budgets.length > 0) {
    const budgetRows = budgets.map((b) => {
      const spent = expenseItems
        .filter((e) => e.category === b.category)
        .reduce((s, e) => s + Number(e.amount), 0);
      const limit = Number(b.limit);
      const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
      let status = 'On Track';
      if (pct >= 100) status = 'Over Budget';
      else if (pct >= 80) status = 'Near Limit';
      return [b.category, formatINR(spent), formatINR(limit), `${pct}%`, status];
    });
    doc.autoTable({
      startY: y,
      head: [['Category', 'Spent', 'Limit', 'Usage %', 'Status']],
      body: budgetRows,
      theme: 'grid',
      headStyles: { fillColor: BRAND_COLOR, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8, textColor: DARK_TEXT },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      margin: { left: 14, right: 14 },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 4) {
          const val = data.cell.raw;
          if (val === 'Over Budget') data.cell.styles.textColor = [220, 38, 38];
          else if (val === 'Near Limit') data.cell.styles.textColor = [217, 119, 6];
          else data.cell.styles.textColor = [5, 150, 105];
        }
      },
    });
    y = doc.lastAutoTable.finalY + 10;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('No budgets set.', 14, y);
    y += 10;
  }

  // 6. Bills
  sectionTitle('Bills');
  if (bills.length > 0) {
    const billRows = bills.map((b) => [
      b.name,
      formatDate(b.dueDate),
      formatINR(b.amount),
      b.paid ? 'Paid' : 'Pending',
    ]);
    doc.autoTable({
      startY: y,
      head: [['Bill Name', 'Due Date', 'Amount', 'Status']],
      body: billRows,
      theme: 'grid',
      headStyles: { fillColor: BRAND_COLOR, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8, textColor: DARK_TEXT },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      margin: { left: 14, right: 14 },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 3) {
          const val = data.cell.raw;
          if (val === 'Paid') data.cell.styles.textColor = [5, 150, 105];
          else data.cell.styles.textColor = [217, 119, 6];
        }
      },
    });
    y = doc.lastAutoTable.finalY + 10;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('No bills for this month.', 14, y);
    y += 10;
  }

  // Add footers to all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }

  return doc;
}

export async function downloadMonthlyPDF(year, month) {
  const doc = generateMonthlyPDF(year, month);
  const monthLabel = formatMonthYear(year, month).replace(/\s+/g, '_');
  const blob = doc.output('blob');
  await shareFile(`Muthu Report ${monthLabel}`, blob, `Muthu_Report_${monthLabel}.pdf`, 'application/pdf');
}

export function getMonthlyPDFBlob(year, month) {
  const doc = generateMonthlyPDF(year, month);
  return doc.output('blob');
}

// ==========================================
// NEW: COMBINED DATE-WISE LEDGER PDF
// ==========================================

export function generateDateWiseLedgerPDF(year, month) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const settings = getSettings();
  const profileName = settings.profileName || '';
  const monthLabel = formatMonthYear(year, month);

  // 1. Get all Income and Expenses for the month
  const incomeItems = getItemsForMonth('income', year, month).map(item => ({ ...item, recordType: 'INCOME' }));
  const expenseItems = getItemsForMonth('expenses', year, month).map(item => ({ ...item, recordType: 'EXPENSE' }));
  const salary = getSalaryForMonth(year, month);

  if (salary > 0) {
    incomeItems.push({
      date: new Date(year, month, 1).toISOString(), 
      title: 'Monthly Salary',
      category: 'Salary',
      amount: salary,
      recordType: 'INCOME'
    });
  }

  // 2. Combine and Sort by Date (Descending - Newest first)
  const allTransactions = [...incomeItems, ...expenseItems].sort((a, b) => new Date(b.date) - new Date(a.date));

  let y = 0;

  function addHeader() {
    doc.setFillColor(...BRAND_COLOR);
    doc.rect(0, 0, pageWidth, 32, 'F');
    doc.setFillColor(...BRAND_LIGHT);
    doc.rect(0, 30, pageWidth, 3, 'F');

    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Muthu Finance', 14, 14);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Date-wise Transaction Ledger', 14, 20);
    doc.setFontSize(11);
    doc.text(monthLabel, pageWidth - 14, 14, { align: 'right' });
    if (profileName) {
      doc.setFontSize(9);
      doc.text(`Prepared for ${profileName}`, pageWidth - 14, 20, { align: 'right' });
    }
    y = 45;
  }

  function addFooter(pageNum, totalPages) {
    const footerY = doc.internal.pageSize.getHeight() - 8;
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${new Date().toLocaleString('en-IN')}`, 14, footerY);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 14, footerY, { align: 'right' });
  }

  addHeader();

  // 3. Table Rows Preparation
  if (allTransactions.length > 0) {
    const tableRows = allTransactions.map((t) => [
      formatDate(t.date),
      t.recordType,
      t.title || t.source || '-',
      t.category || '-',
      formatINR(Number(t.amount))
    ]);

    // 4. Generate PDF Table
    doc.autoTable({
      startY: y,
      head: [['Date', 'Type', 'Description', 'Category', 'Amount']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: BRAND_COLOR, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8, textColor: DARK_TEXT },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      margin: { left: 14, right: 14 },
      didParseCell: function (data) {
        // Color coding: Green for Income, Red for Expense
        if (data.section === 'body' && data.column.index === 1) {
          if (data.cell.raw === 'INCOME') data.cell.styles.textColor = [5, 150, 105]; // Green
          if (data.cell.raw === 'EXPENSE') data.cell.styles.textColor = [220, 38, 38]; // Red
        }
      },
    });
    
    // Add footers to all pages for Ledger
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter(i, totalPages);
    }
    
  } else {
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text('No transactions found for this month.', 14, y);
  }

  return doc;
}

export async function downloadDateWisePDF(year, month) {
  const doc = generateDateWiseLedgerPDF(year, month);
  const monthLabel = formatMonthYear(year, month).replace(/\s+/g, '_');
  const blob = doc.output('blob');
  await shareFile(`Datewise Ledger ${monthLabel}`, blob, `Datewise_Ledger_${monthLabel}.pdf`, 'application/pdf');
}
