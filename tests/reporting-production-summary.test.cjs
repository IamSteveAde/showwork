const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { load } = require('./helpers/load-typescript.cjs');
const mod = { exports: {} };
new Function('require','module','exports', ts.transpileModule(fs.readFileSync('components/calendars/ReportingProductionSummary.tsx','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText)(name => {
  if (name.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
  if (name === '@/lib/workspaceOverview') return load('lib/workspaceOverview.ts');
  if (name === './PlatformBrandIcon') return { __esModule: true, default: ({ platform }) => React.createElement('span', null, platform) };
  return require(name);
}, mod, mod.exports);
const post = (id, extra = {}) => ({ id, platform: 'INSTAGRAM', postDate: '2026-10-01', internalReviewStatus: 'PENDING', approvalStatus: 'APPROVED', hasContent: false, ...extra });
const render = posts => renderToStaticMarkup(React.createElement(mod.exports.default, { posts }));
test('production summary handles empty workspace without invalid chart values', () => {
  const html = render([]);
  assert.doesNotMatch(html, /NaN|Infinity/);
  assert.match(html, /Add your first post/);
});
test('approval readiness requires internal review and labels workspace scope', () => {
  const html = render([post('a'), post('b', { internalReviewStatus: 'APPROVED', hasContent: true, platform: 'TIKTOK' })]);
  assert.match(html, /50<small>%/);
  assert.match(html, /Internal review/);
  assert.match(html, /All dates and platforms/);
  assert.match(html, /1 post has/);
  assert.match(html, /Instagram: 1, TikTok: 1/);
});
