import '@testing-library/jest-dom';

// Ensure a compliant in-memory Storage implementation in Node 26+ JSDOM environments
const memoryStorage = new Map<string, string>();
const safeStorage: Storage = {
  get length() {
    return memoryStorage.size;
  },
  clear() {
    memoryStorage.clear();
  },
  getItem(key: string) {
    return memoryStorage.get(key) ?? null;
  },
  key(index: number) {
    return Array.from(memoryStorage.keys())[index] ?? null;
  },
  removeItem(key: string) {
    memoryStorage.delete(key);
  },
  setItem(key: string, value: string) {
    memoryStorage.set(key, String(value));
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: safeStorage,
  writable: true,
  configurable: true,
});

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: safeStorage,
    writable: true,
    configurable: true,
  });
}
