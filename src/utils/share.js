/**
 * Share utilities — wraps Capacitor Share + Web Share API fallback.
 */

export async function isShareAvailable() {
  try {
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      return true;
    }
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  } catch {
    return false;
  }
}

export async function shareText(title, text) {
  try {
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title, text, dialogTitle: title });
      return true;
    }
    if (navigator.share) {
      await navigator.share({ title, text });
      return true;
    }
    return false;
  } catch (err) {
    if (err.name === 'AbortError') return false;
    console.error('Share failed:', err);
    return false;
  }
}

export async function shareFile(title, fileBlob, fileName, mimeType = 'application/pdf') {
  try {
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');

      const reader = new FileReader();
      const base64 = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(fileBlob);
      });

      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache,
      });

      await Share.share({
        title,
        url: result.uri,
        dialogTitle: title,
      });
      return true;
    }

    if (navigator.share && navigator.canShare) {
      const file = new File([fileBlob], fileName, { type: mimeType });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ title, files: [file] });
        return true;
      }
    }

    const url = URL.createObjectURL(fileBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    if (err.name === 'AbortError') return false;
    console.error('Share PDF failed:', err);
    return false;
  }
}

export function formatDashboardShareText(monthLabel, salary, totalIncome, totalExpenses, remainingBalance) {
  return [
    `Muthu — ${monthLabel} Summary`,
    `Salary: ${salary}`,
    `Total Income: ${totalIncome}`,
    `Total Expenses: ${totalExpenses}`,
    `Remaining Balance: ${remainingBalance}`,
  ].join('\n');
}

export function formatBillShareText(bill) {
  const status = bill.paid ? 'Paid ✅' : 'Pending ⏳';
  return [
    `Muthu — Bill Reminder`,
    `Bill: ${bill.name}`,
    `Amount: ₹${Number(bill.amount).toLocaleString('en-IN')}`,
    `Due Date: ${bill.dueDate}`,
    `Status: ${status}`,
  ].join('\n');
}
