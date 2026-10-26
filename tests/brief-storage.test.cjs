const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers/load-typescript.cjs');
const { checkBriefStorage } = load('lib/content/briefStorage.ts');
test('checks both storage models with a workspace-scoped sentinel before generation', async () => {
  const calls = [];
  const delegate = { findFirst: async args => { calls.push(args); return null; } };
  assert.equal(await checkBriefStorage({ calendarPost: delegate, calendarPostAiGeneration: delegate }, 'workspace'), true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].where.calendarId, 'workspace');
  assert.equal(calls[1].where.post.calendarId, 'workspace');
  assert.ok(calls.every(call => call.where.id === '__showwork_schema_probe__'));
});
for (const model of ['calendarPost', 'calendarPostAiGeneration']) {
  test('fails closed when ' + model + ' has an outdated client or database', async () => {
    const database = {
      calendarPost: { findFirst: async () => null },
      calendarPostAiGeneration: { findFirst: async () => null },
    };
    database[model].findFirst = async () => { throw Error('Unknown argument creativeBrief'); };
    assert.equal(await checkBriefStorage(database, 'workspace'), false);
  });
}
