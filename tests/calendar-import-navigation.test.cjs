const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function harness() {
  const state = [], refs = [], effects = [], cleanup = [], calls = [];
  let cursor = 0, refCursor = 0, effectCursor = 0;
  const modal = { open: false, showModal() { this.open = true; }, close() { this.open = false; calls.push('close'); } };
  const row = { id: 'row-1', source: 'CSV row 2', date: '2026-10-01', time: '9 AM', platform: 'Instagram', contentIdea: 'Launch', caption: 'Hello', status: '', customFields: [] };
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
      return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
    },
    useRef(initial) {
      const index = refCursor++;
      refs[index] ??= { current: index === 0 ? modal : initial };
      return refs[index];
    },
    useMemo: fn => fn(),
    useEffect(fn, deps) {
      const index = effectCursor++;
      if (!effects[index] || deps.some((dep, i) => dep !== effects[index][i])) {
        cleanup[index]?.();
        cleanup[index] = fn();
        effects[index] = deps;
      }
    },
  };
  const mocks = {
    react,
    'next/navigation': { useRouter: () => ({ refresh: () => calls.push('refresh') }) },
    '@/components/ui/UiSymbol': { __esModule: true, default: () => null },
    '@/lib/calendarImport/mapping': {
      IMPORT_FIELDS: [], IMPORT_PLATFORMS: ['INSTAGRAM'],
      mapItems: () => [row], parsePlatforms: () => ['INSTAGRAM'], approvalFor: () => 'PENDING',
      rowIssues: () => ({ errors: [], warnings: [], iso: '2026-10-01T08:00:00Z' }),
      duplicateIndex: () => ({ exact: () => false, possible: () => false, add() {} }),
    },
  };
  const mod = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync('components/calendars/ImportCalendar.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const browser = { dispatchEvent: event => calls.push(`navigate:${event.detail.id}`) };
  const request = async url => ({ ok: true, json: async () => url.endsWith('/preview')
    ? { items: [row], mapping: {}, existing: [], filename: 'plan.csv' }
    : url.endsWith('/confirm') ? { postIds: ['post-1'], skipped: [], firstDate: '2026-10-01T08:00:00Z' } : { posts: [row] } });
  new Function('require', 'module', 'exports', 'window', 'CustomEvent', 'fetch', source)(
    name => mocks[name] ?? require(name), mod, mod.exports, browser,
    class { constructor(type, init) { this.type = type; this.detail = init.detail; } }, request,
  );
  function render() {
    cursor = refCursor = effectCursor = 0;
    return mod.exports.default({ calendarId: 'calendar-1', theme: 'light', onImported: () => calls.push('imported') });
  }
  function nodes(tree, predicate) {
    if (!tree || typeof tree !== 'object') return [];
    if (Array.isArray(tree)) return tree.flatMap(child => nodes(child, predicate));
    return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
  }
  return { render, nodes, calls, modal, unmount: () => cleanup.forEach(fn => fn?.()) };
}

test('confirmation keeps success visible; View calendar closes the modal before selecting Content and refreshing', async () => {
  const h = harness();
  let tree = h.render();
  h.nodes(tree, node => node.type === 'button')[0].props.onClick();
  tree = h.render();
  assert.equal(h.modal.open, true);
  await h.nodes(tree, node => node.type === 'input' && node.props.type === 'file')[0].props.onChange({ target: { files: [{ size: 1 }] } });
  // Upload's handler starts an async operation without returning its promise.
  await new Promise(resolve => setImmediate(resolve));
  tree = h.render();
  const review = h.nodes(tree, node => node.type === 'input' && node.props.type === 'checkbox').at(-1);
  review.props.onChange({ target: { checked: true } });
  tree = h.render();
  const confirm = h.nodes(tree, node => node.type === 'button' && String(node.props.children).startsWith('Confirm import'))[0];
  assert.equal(confirm.props.disabled, false);
  confirm.props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  tree = h.render();
  assert.deepEqual(h.calls, ['imported']);
  assert.equal(h.modal.open, true);
  h.nodes(tree, node => node.type === 'button' && node.props.children === 'View calendar')[0].props.onClick();
  assert.equal(h.modal.open, false);
  assert.deepEqual(h.calls, ['imported', 'close', 'navigate:content', 'refresh']);
});

test('unmounting an open import releases the browser modal state', () => {
  const h = harness();
  const tree = h.render();
  h.nodes(tree, node => node.type === 'button')[0].props.onClick();
  h.render();
  assert.equal(h.modal.open, true);
  h.unmount();
  assert.equal(h.modal.open, false);
  assert.deepEqual(h.calls, ['close']);
});
