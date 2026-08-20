import { addItem } from './storage';
import { v4 as uuidv4 } from 'uuid';

export async function parseSmsList(messages) {
  let count = 0;

  for (const msg of messages) {
    const body = msg.body ? msg.body.toLowerCase() : '';

    // Step 1: Only process SMS from known banks (skip promo/e-commerce SMS with similar words)
    const knownBanks = [
      'indian bank', 'sbi', 'state bank', 'hdfc', 'icici', 'axis bank',
      'kotak', 'pnb', 'punjab national', 'bank of baroda', 'canara bank',
      'union bank', 'idbi', 'yes bank', 'indusind', 'federal bank',
      'boi', 'bank of india', 'central bank', 'iob', 'indian overseas'
    ];
    // Remove spaces from body so "Indian Bank", "IndianBank", "Bank Of Baroda", "BankofBaroda" etc all match
    const bodyNoSpace = body.replace(/\s+/g, '');
    const isBankSms = knownBanks.some(bank => bodyNoSpace.includes(bank.replace(/\s+/g, '')));
    if (!isBankSms) continue;

    // Step 1b: Skip declined/failed transaction SMS (not a real transaction)
    if (/(declined|failed|unsuccessful|reversed|not processed)/.test(body)) continue;

    // Step 2: Regex for amount: Rs., INR, ₹ followed by amount
    const amountMatch = body.match(/(?:rs\.?|inr|₹)\s*([\d,]+\.?\d*)/);
    if (!amountMatch) continue;
    
    const amountStr = amountMatch[1].replace(/,/g, '');
    const amount = parseFloat(amountStr);
    
    // Step 3: Check debit/credit indicators (w/d and withdrawn cover ATM withdrawals)
    const isDebit = /(debited|spent|paid|deducted|sent|w\/d|withdraw)/.test(body);
    const isCredit = /(credited|received|deposited)/.test(body);
    
    if (!isDebit && !isCredit) continue;
    
    const type = isDebit ? 'expenses' : 'income';
    let name = isDebit ? 'Auto Expense' : 'Auto Income';
    
    // Try to extract merchant/recipient
    const toMatch = body.match(/(?:to|at|vpa|info)(?:\:|-)?\s+([a-z0-9\s*.\-]+?)(?:\s*[\.\s](?:on|ref|rrn|val|avbl|avl|bal|from|date)|$)/);
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
