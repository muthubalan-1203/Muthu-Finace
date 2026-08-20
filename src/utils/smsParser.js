import { addItem } from './storage';
import { v4 as uuidv4 } from 'uuid';

export async function parseSmsList(messages) {
  let count = 0;

  for (const msg of messages) {
    const body = msg.body ? msg.body.toLowerCase() : '';

    // 1. Check whether this is a known bank SMS
    const knownBanks = [
      'indian bank',
      'sbi',
      'state bank',
      'hdfc',
      'icici',
      'axis bank',
      'kotak',
      'pnb',
      'punjab national',
      'bank of baroda',
      'canara bank',
      'union bank',
      'idbi',
      'yes bank',
      'indusind',
      'federal bank',
      'boi',
      'bank of india',
      'central bank',
      'iob',
      'indian overseas'
    ];

    const bodyNoSpace = body.replace(/\s+/g, '');

    const isBankSms = knownBanks.some(bank =>
      bodyNoSpace.includes(bank.replace(/\s+/g, ''))
    );

    if (!isBankSms) continue;

    // 2. Skip failed / declined / reversed transactions
    if (
      /(declined|failed|unsuccessful|reversed|not processed)/.test(body)
    ) {
      continue;
    }

    // 3. Extract amount
    const amountMatch = body.match(
      /(?:rs\.?|inr|₹)\s*([\d,]+\.?\d*)/
    );

    if (!amountMatch) continue;

    const amountStr = amountMatch[1].replace(/,/g, '');
    const amount = parseFloat(amountStr);

    if (!Number.isFinite(amount) || amount <= 0) continue;

    // 4. Detect CREDIT / DEBIT
    const isDebit =
      /(debited|spent|paid|deducted|sent|w\/d|withdraw|withdrawn)/.test(body);

    const isCredit =
      /(credited|received|deposited)/.test(body);

    if (!isDebit && !isCredit) continue;

    // If both somehow appear, prioritize the explicit transaction wording
    let type;
    if (isCredit && !isDebit) {
      type = 'income';
    } else if (isDebit && !isCredit) {
      type = 'expenses';
    } else {
      // When both words are present, use the first strong transaction keyword
      const creditIndex = body.search(
        /(credited|received|deposited)/
      );

      const debitIndex = body.search(
        /(debited|spent|paid|deducted|sent|w\/d|withdraw|withdrawn)/
      );

      type =
        creditIndex !== -1 &&
        (debitIndex === -1 || creditIndex < debitIndex)
          ? 'income'
          : 'expenses';
    }

    // Default title
    let name = type === 'expenses'
      ? 'Auto Expense'
      : 'Auto Income';

    /*
     * 5. Extract the person / merchant name
     *
     * CREDIT:
     *   from Rahul
     *   by Rahul
     *   received from Rahul
     *   credited by Rahul
     *
     * DEBIT:
     *   to Rahul
     *   at Amazon
     *   towards Flipkart
     *   by Swiggy
     *   via VPA / UPI merchant information
     */

    let nameMatch = null;

    if (type === 'income') {
      // For CREDIT transactions, find sender
      nameMatch = body.match(
        /(?:from|by)(?:\s*[:\-])?\s+([a-z0-9][a-z0-9\s*._@&'/-]*?)(?=\s+(?:on|ref|rrn|val|avbl|avl|bal|date|a\/c|acct|account|utr|txn|transaction|for|via)\b|[.,;]|$)/i
      );
    } else {
      // For DEBIT transactions, find receiver / merchant
      nameMatch = body.match(
        /(?:to|at|towards|by|vpa|info)(?:\s*[:\-])?\s+([a-z0-9][a-z0-9\s*._@&'/-]*?)(?=\s+(?:on|ref|rrn|val|avbl|avl|bal|date|a\/c|acct|account|utr|txn|transaction|for|via|from)\b|[.,;]|$)/i
      );
    }

    if (nameMatch && nameMatch[1]) {
      let rawName = nameMatch[1].trim();

      // Remove unwanted trailing transaction words
      rawName = rawName.replace(
        /\s+(?:on|ref|rrn|val|avbl|avl|bal|date|a\/c|acct|account|utr|txn|transaction|for|via|from)\b.*$/i,
        ''
      );

      // Remove extra punctuation
      rawName = rawName.replace(/^[\s:,-]+|[\s:,-]+$/g, '').trim();

      // Don't use the name if it accidentally captured only a generic word
      const invalidNames = [
        'account',
        'a/c',
        'acct',
        'bank',
        'transaction',
        'payment',
        'amount',
        'upi',
        'vpa'
      ];

      if (
        rawName.length > 0 &&
        rawName.length <= 40 &&
        !invalidNames.includes(rawName.toLowerCase())
      ) {
        name = rawName
          .split(/\s+/)
          .map(word =>
            word.length > 0
              ? word.charAt(0).toUpperCase() + word.slice(1)
              : word
          )
          .join(' ');
      }
    }

    // 6. Convert SMS timestamp to app date
    const dateObj = new Date(msg.date);
    const dateStr = dateObj.toISOString().split('T')[0];

    // 7. Create transaction
    const item = {
      id: uuidv4(),

      // IMPORTANT:
      // Extracted person / merchant name becomes the title
      title: name,

      amount,
      date: dateStr,
      category: 'Auto SMS',

      // Keep these fields compatible with the expense/income pages
      paymentMethod: 'UPI',
      note: 'Added automatically from bank SMS'
    };

    // 8. Save to Income or Expenses
    addItem(type, item);
    count++;
  }

  return count;
}
