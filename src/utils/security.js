/**
 * PIN security utilities using Web Crypto API.
 * Only stores salted SHA-256 hash — never the raw PIN.
 */

async function hashPin(pin, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateSalt() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function createPinHash(pin) {
  const salt = generateSalt();
  const hash = await hashPin(pin, salt);
  return { salt, hash };
}

export async function hashAnswer(answer, salt) {
  const cleanAnswer = (answer || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return await hashPin(cleanAnswer, salt);
}

export async function createAnswerHash(answer) {
  const salt = generateSalt();
  const hash = await hashAnswer(answer, salt);
  return { salt, hash };
}

export async function verifyPin(pin, salt, storedHash) {
  const hash = await hashPin(pin, salt);
  return hash === storedHash;
}

export async function verifyAnswer(answer, salt, storedHash) {
  const hash = await hashAnswer(answer, salt);
  return hash === storedHash;
}

export function isPinValid(pin) {
  if (!pin || typeof pin !== 'string') return false;
  if (pin.length < 4 || pin.length > 6) return false;
  return /^\d+$/.test(pin);
}

export function isLockEnabled() {
  try {
    const raw = localStorage.getItem('muthu:settings');
    if (!raw) return false;
    const settings = JSON.parse(raw);
    return settings.lockEnabled === true && settings.pinHash && settings.pinSalt;
  } catch {
    return false;
  }
}

export function isBiometricAvailable() {
  try {
    return typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}
