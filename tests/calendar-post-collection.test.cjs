const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const mod = { exports: {} };
new Function('exports', ts.transpileModule(fs.readFileSync('lib/calendarPostCollection.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(mod.exports);
const { mergeSavedCalendarPosts: merge } = mod.exports;
test('save after background sync replaces the same post with its completed upload', () => {
  const unrelated = { id: 'older', assets: [] };
  const synced = { id: 'new', assets: [] };
  const saved = { id: 'new', assets: [{ id: 'uploaded' }] };
  const current = [unrelated, synced];
  const result = merge(current, [saved]);
  assert.deepEqual(result, [unrelated, saved]);
  assert.deepEqual(current, [unrelated, synced]);
});
test('save before background sync adds the post once and repeated confirmations are idempotent', () => {
  const saved = { id: 'new', assets: [] };
  const once = merge([], [saved]);
  assert.deepEqual(once, [saved]);
  assert.deepEqual(merge(once, [saved]), once);
});
test('multi-platform content retains distinct database posts with identical content', () => {
  const instagram = { id: 'instagram-post', caption: 'Launch', platform: 'INSTAGRAM' };
  const facebook = { id: 'facebook-post', caption: 'Launch', platform: 'FACEBOOK' };
  assert.deepEqual(merge([instagram], [instagram, facebook]), [instagram, facebook]);
});
test('existing duplicate IDs are collapsed and the latest saved data wins', () => {
  assert.deepEqual(merge([{ id: 'post', caption: 'old' }, { id: 'post', caption: 'synced' }], [{ id: 'post', caption: 'saved' }]), [{ id: 'post', caption: 'saved' }]);
});
