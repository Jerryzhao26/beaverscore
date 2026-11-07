// Track failures by key: a successful write to another key must not hide lost data.
const failedKeys = new Set<string>();
const listeners = new Set<() => void>();
export const subscribeStorage = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const storageFailed = () => failedKeys.size > 0;
export function persistItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
    failedKeys.delete(key);
  } catch (error) {
    failedKeys.add(key);
    throw error;
  } finally {
    listeners.forEach(listener => listener());
  }
}
// Effects must leave the app usable so the user can export an emergency backup.
export function persistItemInBackground(key: string, value: string) {
  try { persistItem(key, value); } catch { /* Displayed by the global storage banner. */ }
}
