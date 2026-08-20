import { addItem } from './storage';
import { v4 as uuidv4 } from 'uuid';

/**
 * Auto SMS Parser
 *
 * Supports:
 * - Bank transactions
 * - UPI payments
 * - ATM withdrawals
 * - Credit / Income
 * - Debit / Expenses
 * - Person / Merchant names
 * - Failed / declined transaction filtering
 */

export async function parseSmsList(messages) {
  let count = 0;

  const knownBanks = [
    { key: 'indian bank', name: 'Indian Bank' },
    { key: 'indianbank', name: 'Indian Bank' },
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

    // =========================================================
    // 1. BANK DETECTION
    // =========================================================

    const bodyNoSpace = body.replace(/\s+/g, '');

    const detectedBank = knownBanks.find(bank =>
      bodyNoSpace.includes(bank.key.replace(/\s+/g, '')) ||
      sender.includes(bank.key.replace(/\s+/g, ''))
    );

    const looksLikeBankTransaction =
      /(upi|a\/c|acct|account|transaction|txn|debited|credited|withdrawn|withdraw|w\/d|debit|credit|paid|received|sent|spent|payment)/i.test(
        body
      );

    if (!detectedBank && !looksLikeBankTransaction) {
      continue;
    }

    const bankName = detectedBank?.name || 'Bank';

    // =========================================================
    // 2. SKIP FAILED / DECLINED TRANSACTIONS
    // =========================================================

    if (
      /(declined|failed|unsuccessful|reversed|revoked|not processed|transaction failed|payment failed)/i.test(
        body
      )
    ) {
      continue;
    }

    // =========================================================
    // 3. DETECT ATM WITHDRAWAL
    // =========================================================

    const isAtmWithdrawal =
      /\b(?:w\/d|withdraw|withdrawn|cash withdrawal|cash withdrawn)\b/i.test(body) ||
      /\batm\s*:/i.test(body) ||
      /\batm\b/i.test(body);

    // =========================================================
    // 4. EXTRACT AMOUNT
    // =========================================================

    let amount = null;

    const amountPatterns = [
      // Example:
      // Rs.10000.00 w/d
      /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d+)?)\s*(?:w\/d|withdraw|withdrawn|debited|credited|paid|sent|spent)?/i,

      // Example:
      // debited Rs.40
      /(?:debited|credited|paid|received|sent|spent|transferred|withdrawn)[^\d₹]{0,30}(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d+)?)/i,

      // Example:
      // for Rs 40
      /(?:for|amount|amt)\s*(?:of|is|:)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d+)?)/i,

      // General
      /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d+)?)/i
    ];

    for (const pattern of amountPatterns) {
      const match = body.match(pattern);

      if (match && match[1]) {
        const parsed = parseFloat(
          match[1].replace(/,/g, '')
        );

        if (Number.isFinite(parsed) && parsed > 0) {
          amount = parsed;
          break;
        }
      }
    }

    if (!amount) continue;

    // =========================================================
    // 5. CREDIT / DEBIT DETECTION
    // =========================================================

    const isCredit =
      /(credited|credit|received|deposited|deposit|money received)/i.test(
        body
      );

    const isDebit =
      /(debited|debit|spent|paid|deducted|sent|transferred|withdraw|withdrawn|w\/d|payment made)/i.test(
        body
      );

    if (!isCredit && !isDebit) {
      continue;
    }

    let type;

    if (isCredit && !isDebit) {
      type = 'income';
    } else if (isDebit && !isCredit) {
      type = 'expenses';
    } else {
      const creditMatch = body.match(
        /(credited|credit|received|deposited|deposit)/
      );

      const debitMatch = body.match(
        /(debited|debit|spent|paid|deducted|sent|transferred|withdrawn|withdraw|w\/d)/
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

    // =========================================================
    // 6. ATM TRANSACTION
    // =========================================================

    if (isAtmWithdrawal && type === 'expenses') {
      const atmLocation = extractAtmLocation(body);

      const item = {
        id: uuidv4(),

        title: 'ATM Withdrawal',

        amount,

        date: getTransactionDate(msg),

        category: 'Auto SMS',

        paymentMethod: 'Cash',

        note: atmLocation
          ? `Auto SMS • ${bankName} • ${atmLocation}`
          : `Auto SMS • ${bankName} • ATM`
      };

      addItem('expenses', item);

      count++;

      continue;
    }

    // =========================================================
    // 7. PERSON / MERCHANT NAME
    // =========================================================

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
            // paid to / sent to / transferred to
            /(?:paid|sent|transferred|debited)\s+(?:to|for)\s+([a-z0-9][a-z0-9\s._@&'/-]{1,50}?)(?=\s+(?:on|at|via|ref|rrn|utr|txn|transaction|a\/c|acct|account|avbl|avail|bal|balance)\b|[.,;]|$)/i,

            // to Rahul
            /\bto\s+([a-z0-9][a-z0-9\s._@&'/-]{1,50}?)(?=\s+(?:on|at|via|ref|rrn|utr|txn|transaction|a\/c|acct|account|avbl|avail|bal|balance|from)\b|[.,;]|$)/i,

            // at Amazon
            /\bat\s+([a-z0-9][a-z0-9\s._@&'/-]{1,50}?)(?=\s+(?:on|via|ref|rrn|utr|txn|transaction|a\/c|acct|account|avbl|avail|bal|balance)\b|[.,;]|$)/i,

            // towards Murugan
            /\btowards\s+([a-z0-9][a-z0-9\s._@&'/-]{1,50}?)(?=\s+(?:on|via|ref|rrn|utr|txn|transaction|a\/c|acct|account|avbl|avail|bal|balance)\b|[.,;]|$)/i,

            // UPI merchant
            /(?:upi|vpa)\s*(?:to|at|for|:|-)?\s*([a-z0-9][a-z0-9._@-]{2,50})/i,

            // Merchant / payee
            /(?:merchant|payee)\s*(?:name)?\s*[:\-]?\s*([a-z0-9][a-z0-9\s._@&'/-]{1,50}?)(?=\s+(?:on|via|ref|rrn|utr|txn|transaction)\b|[.,;]|$)/i
          ];

    for (const pattern of namePatterns) {
      const match = body.match(pattern);

      if (match && match[1]) {
        let candidate = match[1].trim();

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

    // =========================================================
    // 8. UPI ID FALLBACK
    // =========================================================

    if (!extractedName) {
      const upiMatch = body.match(
        /\b([a-z0-9._-]{2,50}@[a-z]{2,30})\b/i
      );

      if (upiMatch && upiMatch[1]) {
        extractedName = upiMatch[1];
      }
    }

    // =========================================================
    // 9. DEFAULT NAME
    // =========================================================

    if (!extractedName) {
      extractedName =
        type === 'expenses'
          ? 'Auto Expense'
          : 'Auto Income';
    }

    // =========================================================
    // 10. DATE
    // =========================================================

    const dateStr = getTransactionDate(msg);

    // =========================================================
    // 11. PAYMENT METHOD
    // =========================================================

    const paymentMethod = isAtmWithdrawal
      ? 'Cash'
      : 'UPI';

    // =========================================================
    // 12. CREATE NORMAL TRANSACTION
    // =========================================================

    let item;

    if (type === 'expenses') {
      item = {
        id: uuidv4(),

        title: extractedName,

        amount,

        date: dateStr,

        category: 'Auto SMS',

        paymentMethod,

        note: `Auto SMS • ${bankName}`
      };
    } else {
      item = {
        id: uuidv4(),

        source: extractedName,

        amount,

        date: dateStr,

        category: 'Auto SMS',

        note: `Auto SMS • ${bankName}`
      };
    }

    // =========================================================
    // 13. SAVE
    // =========================================================

    addItem(type, item);

    count++;
  }

  return count;
}


// =============================================================
// ATM LOCATION
// =============================================================

function extractAtmLocation(body) {
  // Example:
  // ATM:CUB01777 , ALANGANALLUR II

  const atmMatch = body.match(
    /atm\s*:\s*([a-z0-9]+)\s*,?\s*([^.\n]+?)(?=\s+on\s+|\s+rrn\s*:|$)/i
  );

  if (atmMatch) {
    const code = atmMatch[1]
      ? atmMatch[1].trim()
      : '';

    const location = atmMatch[2]
      ? atmMatch[2].trim()
      : '';

    if (location) {
      return `${formatName(location)} (${code.toUpperCase()})`;
    }

    if (code) {
      return `ATM ${code.toUpperCase()}`;
    }
  }

  // Fallback: "at ATM:..."
  const simpleAtm = body.match(
    /\bat\s+atm\s*:?\s*([^.\n]+)/i
  );

  if (simpleAtm && simpleAtm[1]) {
    return formatName(simpleAtm[1].trim());
  }

  return '';
}


// =============================================================
// DATE
// =============================================================

function getTransactionDate(msg) {
  const dateObj = new Date(msg?.date || Date.now());

  if (Number.isNaN(dateObj.getTime())) {
    return new Date().toISOString().split('T')[0];
  }

  return dateObj.toISOString().split('T')[0];
}


// =============================================================
// NAME VALIDATION
// =============================================================

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


// =============================================================
// FORMAT NAME
// =============================================================

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
