import { addItem } from './storage';
import { v4 as uuidv4 } from 'uuid';

export async function parseSmsList(messages) {
  let count = 0;

  for (const msg of messages) {
    const body = msg.body ? msg.body.toLowerCase() : '';
    
    // Regex for amount: Rs., INR, ₹ followed by amount
    const amountMatch = body.match(/(?:rs\.?|inr|₹)\s*([\d,]+\.?\d*)/);
    if (!amountMatch) continue;
    
    const amountStr = amountMatch[1].replace(/,/g, '');
    const amount = parseFloat(amountStr);
    
    // Check debit/credit indicators
    const isDebit = /(debited|spent|paid|deducted)/.test(body);
    const isCredit = /(credited|received|deposited)/.test(body);
    
    if (!isDebit && !isCredit) continue;
    
    const type = isDebit ? 'expenses' : 'income';
    let name = isDebit ? 'Auto Expense' : 'Auto Income';
    
    // Try to extract merchant/recipient
    const toMatch = body.match(/(?:to|at|vpa|info)(?:\:|-)?\s+([a-z0-9\s*.\-]+?)(?:\s+(?:on|ref|val|avbl|avl|bal|from|date)|$)/);
    if (toMatch && toMatch[1]) {
      let rawName = toMatch[1].trim();
      if (rawName.length > 20) rawName = rawName.substring(0, 20);
      name = rawName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    // Convert SMS timestamp (ms) to ISO date format for the app
    const dateObj = new Date(msg.date);
    const dateStr = dateObj.toISOString().split('T')[0];

    const item = {
      id: uuidv4(),
      name,
      amount,
      date: dateStr,
      category: 'Auto SMS', // Special category for SMS
    };

    addItem(type, item);
    count++;
  }

  return count;
}
