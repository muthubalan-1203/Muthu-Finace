import { addItem } from './storage';
import { v4 as uuidv4 } from 'uuid';

/**
 * Auto SMS Parser
 *
 * Flow:
 * 1. Bank SMS check
 * 2. Failed / declined transaction skip
 * 3. Transaction amount detect
 * 4. Credit / Debit detect
 * 5. Bank name detect
 * 6. Person / Merchant / UPI name detect
 * 7. Save to Income or Expenses
 */

export async function parseSmsList(messages) {
  let count = 0;

  // Supported banks
  const knownBanks = [
    { key: 'indian bank', name: 'Indian Bank' },
    { key: 'sbi', name: 'SBI' },
    { key: 'state bank of india', name: 'SBI' },
    { key: 'hdfc', name: 'HDFC Bank' },
    { key: 'icici', name: 'ICICI Bank' },
    { key: 'axis', name: 'Axis Bank' },
    { key: 'kotak', name: 'Kotak Bank' },
    { key: 'pnb', name: 'Punjab National Bank' },
    { key: 'punjab national', name: 'Punjab National Bank' },
    { key: 'bank of baroda', name: 'Bank of Baroda' },
    { key: 'canara', name: 'Canara Bank' },
    { key: 'union bank', name: 'Union Bank' },
    { key: 'idbi', name: 'IDBI Bank' },
    { key: 'yes bank', name: 'Yes Bank' },
    { key: 'indusind', name: 'IndusInd Bank' },
    { key: 'federal bank', name: 'Federal Bank' },
    { key: 'bank of india', name: 'Bank of India' },
    { key: 'central bank', name: 'Central Bank of India' },
    { key: 'iob', name: 'Indian Overseas Bank' },
    { key: 'indian overseas', name: 'Indian Overseas Bank' }
  ];

  for (const msg of messages) {
    const originalBody = msg?.body || '';
    const body = originalBody.toLowerCase();
    const sender = String(
      msg?.address ||
      msg?.sender ||
      msg?.from ||
      ''
    ).toLowerCase();

    if (!body.trim()) continue;

    // ---------------------------------------------------------
    // 1. CHECK BANK SMS
    // ---------------------------------------------------------

    const bodyNoSpace = body.replace(/\s+/g, '');

    const detectedBank = knownBanks.find(bank =>
      bodyNoSpace.includes(bank.key.replace(/\s+/g, '')) ||
      sender.includes(bank.key.replace(/\s+/g, ''))
    );

    // Also allow common UPI/bank transaction SMS
    const looksLikeBankTransaction =
      /(upi|a\/c|acct|account|transaction|txn|debited|credited|withdrawn|withdraw|debit|credit|paid|received|sent|spent|payment)/i.test(
        body
      );

    if (!detectedBank && !looksLikeBankTransaction) {
      continue;
    }

    const bankName = detectedBank?.name || 'Bank';

    // ---------------------------------------------------------
    // 2. SKIP FAILED / DECLINED TRANSACTIONS
    // ---------------------------------------------------------

    if (
      /(declined|failed|unsuccessful|reversed|revoked|not processed|transaction failed|payment failed)/i.test(
        body
      )
    ) {
      continue;
    }

    // ---------------------------------------------------------
    // 3. EXTRACT TRANSACTION AMOUNT
    // ---------------------------------------------------------

    let amount = null;

    // Most reliable transaction amount patterns first
    const amountPatterns = [
      /(?:debited|credited|paid|received|sent|spent|transferred|deposit(?:ed)?|withdrawn)[^\d₹]{0,30}(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d+)?)/i,

      /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d+)?)\s*(?:has been|was|is)?\s*(?:debited|credited|paid|received|sent|transferred)/i,

      /(?:amount|amt)\s*(?:of|is|:)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d+)?)/i,

      /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d+)?)/i
    ];

    for (const pattern of amountPatterns) {
      const match = body.match(pattern);

      if (match && match[1]) {
        const parsed = parseFloat(match[1].replace(/,/g, ''));

        if (Number.isFinite(parsed) && parsed > 0) {
          amount = parsed;
          break;
        }
      }
    }

    if (!amount) continue;

    // ---------------------------------------------------------
    // 4. DETECT CREDIT / DEBIT
    // ---------------------------------------------------------

    const creditPatterns = [
      /credited/i,
      /credit/i,
      /received/i,
      /deposited/i,
      /deposit/i,
      /received from/i,
      /money received/i
    ];

    const debitPatterns = [
      /debited/i,
      /debit/i,
      /spent/i,
      /paid/i,
      /deducted/i,
      /sent/i,
      /transferred/i,
      /withdraw/i,
      /withdrawn/i,
      /payment made/i
    ];

    const isCredit = creditPatterns.some(pattern =>
      pattern.test(body)
    );

    const isDebit = debitPatterns.some(pattern =>
      pattern.test(body)
    );

    if (!isCredit && !isDebit) continue;

    let type;

    if (isCredit && !isDebit) {
      type = 'income';
    } else if (isDebit && !isCredit) {
      type = 'expenses';
    } else {
      // Both words exist.
      // Use the first transaction keyword in the SMS.
      const creditMatch = body.match(
        /(credited|credit|received|deposited|deposit)/
      );

      const debitMatch = body.match(
        /(debited|debit|spent|paid|deducted|sent|transferred|withdrawn|withdraw)/
      );

      const creditIndex = creditMatch
        ? creditMatch.index
        : Infinity;

      const debitIndex = debitMatch
        ? debitMatch.index
        : Infinity;

      type =
        creditIndex < debitIndex
          ? 'income'
          : 'expenses';
    }

    // ---------------------------------------------------------
    // 5. EXTRACT PERSON / MERCHANT / UPI NAME
    // ---------------------------------------------------------

    let extractedName = '';

    const namePatterns =
      type === 'income'
        ? [
            // received from Rahul
            /(?:received|credited|credit|deposit(?:ed)?)\s+(?:from|by)\s+([a-z0-9][a-z0-9\s._@&'/-]{1,50}?)(?=\s+(?:on|at|for|via|ref|rrn|utr|txn|transaction|a\/c|acct|account|avbl|avail|bal|balance)\b|[.,;]|$)/i,

            // from Rahul
            /\bfrom\s+([a-z0-9][a-z0-9\s._@&'/-]{1,50}?)(?=\s+(?:on|at|for|via|ref|rrn|utr|txn|transaction|a\/c|acct|account|avbl|avail|bal|balance)\b|[.,;]|$)/i,

            // by Rahul
            /\bby\s+([a-z0-9][a-z0-9\s._@&'/-]{1,50}?)(?=\s+(?:on|at|for|via|ref|rrn|utr|txn|transaction|a\/c|acct|account|avbl|avail|bal|balance)\b|[.,;]|$)/i,

            // UPI sender
            /(?:upi|vpa)\s*(?:from|by|:|-)?\s*([a-z0-9][a-z0-9._@-]{2,50})/i
          ]
        : [
            // paid to Rahul
            /(?:paid|sent|transferred|debited)\s+(?:to|for)\s+([a-z0-9][a-z0-9\s._@&'/-]{1,50}?)(?=\s+(?:on|at|via|ref|rrn|utr|txn|transaction|a\/c|acct|account|avbl|avail|bal|balance)\b|[.,;]|$)/i,

            // to Rahul
            /\bto\s+([a-z0-9][a-z0-9\s._@&'/-]{1,50}?)(?=\s+(?:on|at|via|ref|rrn|utr|txn|transaction|a\/c|acct|account|avbl|avail|bal|balance|from)\b|[.,;]|$)/i,

            // merchant at Amazon
            /\bat\s+([a-z0-9][a-z0-9\s._@&'/-]{1,50}?)(?=\s+(?:on|via|ref|rrn|utr|txn|transaction|a\/c|acct|account|avbl|avail|bal|balance)\b|[.,;]|$)/i,

            // towards Flipkart
            /\btowards\s+([a-z0-9][a-z0-9\s._@&'/-]{1,50}?)(?=\s+(?:on|via|ref|rrn|utr|txn|transaction|a\/c|acct|account|avbl|avail|bal|balance)\b|[.,;]|$)/i,

            // UPI merchant / VPA
            /(?:upi|vpa)\s*(?:to|at|for|:|-)?\s*([a-z0-9][a-z0-9._@-]{2,50})/i,

            // merchant info
            /(?:merchant|payee)\s*(?:name)?\s*[:\-]?\s*([a-z0-9][a-z0-9\s._@&'/-]{1,50}?)(?=\s+(?:on|via|ref|rrn|utr|txn|transaction)\b|[.,;]|$)/i
          ];

    for (const pattern of namePatterns) {
      const match = body.match(pattern);

      if (match && match[1]) {
        let candidate = match[1].trim();

        // Remove unwanted ending
        candidate = candidate.replace(
          /\s+(?:on|at|for|via|ref|rrn|utr|txn|transaction|a\/c|acct|account|avbl|avail|bal|balance|from)\b.*$/i,
          ''
        );

        candidate = candidate
          .replace(/^[\s:,\-]+|[\s:,\-]+$/g, '')
          .trim();

        if (isValidName(candidate)) {
          extractedName = formatName(candidate);
          break;
        }
      }
    }

    // ---------------------------------------------------------
    // 6. FALLBACK: EXTRACT UPI ID
    // ---------------------------------------------------------

    if (!extractedName) {
      const upiMatch = body.match(
        /\b([a-z0-9._-]{2,50}@[a-z]{2,30})\b/i
      );

      if (upiMatch && upiMatch[1]) {
        extractedName = upiMatch[1];
      }
    }

    // ---------------------------------------------------------
    // 7. FALLBACK TITLE
    // ---------------------------------------------------------

    if (!extractedName) {
      extractedName =
        type === 'expenses'
          ? 'Auto Expense'
          : 'Auto Income';
    }

    // ---------------------------------------------------------
    // 8. DATE
    // ---------------------------------------------------------

    const dateObj = new Date(msg?.date || Date.now());

    let dateStr;

    if (Number.isNaN(dateObj.getTime())) {
      dateStr = new Date().toISOString().split('T')[0];
    } else {
      dateStr = dateObj.toISOString().split('T')[0];
    }

    // ---------------------------------------------------------
    // 9. CREATE TRANSACTION
    // ---------------------------------------------------------

    let item;

    if (type === 'expenses') {
      // Expenses.jsx expects `title`
      item = {
        id: uuidv4(),

        title: extractedName,

        amount,

        date: dateStr,

        category: 'Auto SMS',

        paymentMethod: 'UPI',

        note: `Auto SMS • ${bankName}`
      };
    } else {
      // Income.jsx expects `source`
      item = {
        id: uuidv4(),

        source: extractedName,

        amount,

        date: dateStr,

        category: 'Auto SMS',

        note: `Auto SMS • ${bankName}`
      };
    }

    // ---------------------------------------------------------
    // 10. SAVE
    // ---------------------------------------------------------

    addItem(type, item);

    count++;
  }

  return count;
}


// ============================================================
// HELPERS
// ============================================================

function isValidName(value) {
  if (!value) return false;

  const name = value.trim().toLowerCase();

  const invalidNames = [
    'account',
    'a/c',
    'acct',
    'bank',
    'transaction',
    'payment',
    'amount',
    'upi',
    'vpa',
    'credit',
    'credited',
    'debit',
    'debited',
    'cash',
    'balance',
    'available',
    'avbl',
    'avail',
    'transfer',
    'transferred',
    'received',
    'paid',
    'sent',
    'money'
  ];

  if (invalidNames.includes(name)) {
    return false;
  }

  if (name.length < 2) {
    return false;
  }

  if (name.length > 50) {
    return false;
  }

  return true;
}


function formatName(value) {
  return value
    .trim()
    .split(/\s+/)
    .map(word => {
      if (!word) return word;

      // Keep UPI IDs unchanged
      if (word.includes('@')) {
        return word;
      }

      return (
        word.charAt(0).toUpperCase() +
        word.slice(1)
      );
    })
    .join(' ');
}
