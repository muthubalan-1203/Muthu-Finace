import { db, doc, setDoc, deleteDoc } from './firebase';

const NAMESPACE = 'muthu';

function key(entity) {
  return `${NAMESPACE}:${entity}`;
}

export function getAll(entity) {
  try {
    const raw = localStorage.getItem(key(entity));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setAll(entity, data) {
  localStorage.setItem(key(entity), JSON.stringify(data));
}

export function getOne(entity, id) {
  return getAll(entity).find((item) => item.id === id) || null;
}

export function addItem(entity, item) {
  const items = getAll(entity);
  const settings = getSettings();
  const addedBy = settings.deviceProfile || 'Muthu'; // Default to Muthu if not set
  const newItem = { ...item, id: generateId(), createdAt: new Date().toISOString(), addedBy };
  items.push(newItem);
  setAll(entity, items);

  if (entity !== 'settings') {
    const docRef = doc(db, 'users/muthu-abi/transactions', newItem.id);
    setDoc(docRef, { ...newItem, _entity: entity }).catch((e) => console.warn('Firebase error:', e));
  }
  
  return newItem;
}

export function updateItem(entity, id, updates) {
  const items = getAll(entity);
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...updates, updatedAt: new Date().toISOString() };
  setAll(entity, items);

  if (entity !== 'settings') {
    const docRef = doc(db, 'users/muthu-abi/transactions', id);
    setDoc(docRef, { ...items[idx], _entity: entity }, { merge: true }).catch((e) => console.warn('Firebase error:', e));
  }
  return items[idx];
}

export function deleteItem(entity, id) {
  const items = getAll(entity);
  const filtered = items.filter((item) => item.id !== id);
  setAll(entity, filtered);

  if (entity !== 'settings') {
    const docRef = doc(db, 'users/muthu-abi/transactions', id);
    deleteDoc(docRef).catch((e) => console.warn('Firebase error:', e));
  }
  return filtered;
}

export function getSettings() {
  try {
    const raw = localStorage.getItem(key('settings'));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveSettings(settings) {
  const current = getSettings();
  const merged = { ...current, ...settings };
  localStorage.setItem(key('settings'), JSON.stringify(merged));
  return merged;
}

export function exportAllData() {
  const data = {};
  const entities = ['salary', 'income', 'expenses', 'budgets', 'savings', 'bills', 'goals', 'notes', 'settings'];
  entities.forEach((entity) => {
    const raw = localStorage.getItem(key(entity));
    if (raw) {
      data[entity] = JSON.parse(raw);
    }
  });
  data._exportedAt = new Date().toISOString();
  data._version = '1.0';
  return data;
}

export function importAllData(data) {
  const entities = ['salary', 'income', 'expenses', 'budgets', 'savings', 'bills', 'goals', 'notes', 'settings'];
  entities.forEach((entity) => {
    if (data[entity] !== undefined) {
      localStorage.setItem(key(entity), JSON.stringify(data[entity]));
    }
  });
}

export function clearAllData() {
  const entities = ['salary', 'income', 'expenses', 'budgets', 'savings', 'bills', 'goals', 'notes', 'settings'];
  entities.forEach((entity) => {
    localStorage.removeItem(key(entity));
  });
}

export function getStorageUsage() {
  const entities = ['salary', 'income', 'expenses', 'budgets', 'savings', 'bills', 'goals', 'notes', 'settings'];
  const usage = {};
  let total = 0;
  entities.forEach((entity) => {
    const raw = localStorage.getItem(key(entity));
    const bytes = raw ? new Blob([raw]).size : 0;
    usage[entity] = bytes;
    total += bytes;
  });
  usage._total = total;
  return usage;
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export function getSalaryForMonth(year, month) {
  const salaries = getAll('salary');
  let applicable = null;
  for (const s of salaries) {
    const d = new Date(s.effectiveFrom);
    if (d.getFullYear() === year && d.getMonth() === month) {
      applicable = s;
      break;
    }
  }
  return applicable ? Number(applicable.amount) : 0;
}

export function getItemsForMonth(entity, year, month) {
  return getAll(entity).filter((item) => {
    const d = new Date(item.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

export function filterByProfile(items, profile) {
  if (!profile || profile === 'Family') return items;
  // Items without addedBy field (old data) default to 'Muthu'
  return items.filter(item => (item.addedBy || 'Muthu') === profile);
}
