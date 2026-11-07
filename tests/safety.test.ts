import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { parseGistUrlParams, generateGistShareUrl } from '../src/utils/gistSync';
import { persistItem, storageFailed } from '../src/utils/storage';
import { assertUniqueRosterField } from '../src/utils/rosterValidation';
const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
afterEach(() => {
  for (const [key, descriptor] of [['window', oldWindow], ['localStorage', oldStorage]] as const) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete (globalThis as any)[key];
  }
});
test('share links omit credentials in full and hash modes', () => {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: new URL('https://example.com/app?token=old') } });
  for (const useHash of [false, true]) {
    const result = generateGistShareUrl({ gistId: '0123456789abcdef0123456789abcdef', token: 'secret', mode: 'full', useHash });
    assert.ok(!result.includes('token')); assert.ok(!result.includes('secret'));
  }
});
test('legacy URL credentials are ignored and scrubbed', () => {
  let replacement = '';
  const location = new URL('https://example.com/?gistId=0123456789abcdef0123456789abcdef&token=secret&keep=1#pat=secret2');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { location, history: { state: null, replaceState(_s: any, _t: string, url: string) { replacement = url; } } } });
  assert.equal(parseGistUrlParams().token, undefined);
  assert.ok(!replacement.includes('secret')); assert.ok(replacement.includes('keep=1'));
});
test('storage failure clears only when failed key succeeds', () => {
  let failing = true;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { setItem() { if (failing) throw new Error('quota'); } } });
  assert.throws(() => persistItem('failed', 'data')); assert.equal(storageFailed(), true);
  failing = false; persistItem('other', 'data'); assert.equal(storageFailed(), true);
  persistItem('failed', 'data'); assert.equal(storageFailed(), false);
});
test('roster identity validates duplicates, self edits and deleted entities', () => {
  const items = [{ id: 'a', name: '一班' }, { id: 'b', name: '二班', isDeleted: true }];
  assert.throws(() => assertUniqueRosterField(items, 'name', ' 一班 '));
  assert.doesNotThrow(() => assertUniqueRosterField(items, 'name', '一班', 'a'));
  assert.doesNotThrow(() => assertUniqueRosterField(items, 'name', '二班'));
});
