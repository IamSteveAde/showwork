'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function load(file) {
  const mod = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  new Function('require', 'module', 'exports', js)(require, mod, mod.exports);
  return mod.exports;
}

const { isAffirmativeGoAhead } = load('lib/knowledge/randy/answer.ts');

test('isAffirmativeGoAhead detects single-word affirmations', () => {
  assert.equal(isAffirmativeGoAhead('yes'), true);
  assert.equal(isAffirmativeGoAhead('Yes!'), true);
  assert.equal(isAffirmativeGoAhead('sure'), true);
  assert.equal(isAffirmativeGoAhead('ok'), true);
  assert.equal(isAffirmativeGoAhead('okay'), true);
  assert.equal(isAffirmativeGoAhead('yep'), true);
});

test('isAffirmativeGoAhead detects common action go-aheads', () => {
  assert.equal(isAffirmativeGoAhead('go ahead'), true);
  assert.equal(isAffirmativeGoAhead('Go ahead.'), true);
  assert.equal(isAffirmativeGoAhead('yes, go ahead!'), true);
  assert.equal(isAffirmativeGoAhead('proceed'), true);
  assert.equal(isAffirmativeGoAhead('please proceed'), true);
  assert.equal(isAffirmativeGoAhead('do it'), true);
  assert.equal(isAffirmativeGoAhead('please do that'), true);
  assert.equal(isAffirmativeGoAhead('start research'), true);
  assert.equal(isAffirmativeGoAhead('yes please do the research'), true);
  assert.equal(isAffirmativeGoAhead('save it'), true);
  assert.equal(isAffirmativeGoAhead('add it to knowledge'), true);
  assert.equal(isAffirmativeGoAhead('sounds good, do it'), true);
  assert.equal(isAffirmativeGoAhead('let\'s do it'), true);
});

test('isAffirmativeGoAhead rejects non-affirmative or new conversational queries', () => {
  assert.equal(isAffirmativeGoAhead('what do you think about our competitors?'), false);
  assert.equal(isAffirmativeGoAhead('tell me more about target audiences'), false);
  assert.equal(isAffirmativeGoAhead('no, do something else instead'), false);
  assert.equal(isAffirmativeGoAhead('I am not sure yet'), false);
  assert.equal(isAffirmativeGoAhead(''), false);
});

