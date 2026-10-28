const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { webcrypto } = require('node:crypto');
function makeQueue(limit = 3) {
  const { WorkspaceUploadQueue } = require('./helpers/load-typescript.cjs').load('lib/workspaceUploadQueue.ts');
  return new WorkspaceUploadQueue(limit);
}
const tick = () => new Promise(resolve => setImmediate(resolve));
const file = (name = 'photo.jpg') => ({ name, size: 100, type: name.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg' });
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; };
test('caps global transfers and permits only one video while photos use remaining slots', async () => {
  const queue = makeQueue(); const gate = deferred(); let active = 0, peak = 0, videos = 0, videoPeak = 0;
  const jobs = ['a.mp4', 'b.mp4', 'a.jpg', 'b.jpg', 'c.jpg'].map(name => queue.enqueue('a', file(name), async () => {
    active++; peak = Math.max(peak, active); if (name.endsWith('mp4')) { videos++; videoPeak = Math.max(videoPeak, videos); }
    await gate.promise; active--; if (name.endsWith('mp4')) videos--;
  }));
  await tick(); assert.equal(peak, 3); assert.equal(videoPeak, 1);
  gate.resolve(); await Promise.all(jobs); assert.equal(peak, 3); assert.equal(videoPeak, 1);
});
test('retry reuses successful preparation and transfer but retries saving only', async () => {
  const queue = makeQueue(); let prepare = 0, transfer = 0, save = 0;
  const job = queue.enqueue('a', file(), async task => {
    await task.step('prepare', async () => ++prepare);
    await task.step('transfer', async () => ++transfer);
    task.saving(); if (++save === 1) throw new Error('Temporary save failure'); return 'saved';
  });
  await tick(); assert.equal(queue.getSnapshot()[0].state, 'failed');
  queue.retry(queue.getSnapshot()[0].id);
  assert.equal(await job, 'saved'); assert.deepEqual([prepare, transfer, save], [1, 1, 2]);
});
test('failed files free capacity; retry does not repeat successful siblings', async () => {
  const queue = makeQueue(1); let first = 0, second = 0;
  const a = queue.enqueue('a', file(), async () => { if (++first === 1) throw Error('network'); });
  const b = queue.enqueue('a', file('b.jpg'), async () => { second++; });
  await b; await tick(); queue.retry(queue.getSnapshot()[0].id); await a;
  assert.equal(first, 2); assert.equal(second, 1);
});
test('cancels queued files without starting them and signals active transfers', async () => {
  const queue = makeQueue(1); const gate = deferred(); let signal, started = false;
  const active = queue.enqueue('a', file(), async task => { signal = task.signal; await gate.promise; });
  const waiting = queue.enqueue('a', file('b.jpg'), async () => { started = true; });
  const outcome = Promise.allSettled([active, waiting]); await tick();
  const rows = queue.getSnapshot(); queue.cancel(rows[1].id); queue.cancel(rows[0].id);
  assert.equal(signal.aborted, true); gate.resolve(); await outcome; await tick();
  assert.equal(started, false); assert.ok(queue.getSnapshot().every(r => r.state === 'cancelled'));
});
test('saving cannot be cancelled because its server commit may already have happened', async () => {
  const queue = makeQueue(); const gate = deferred();
  const job = queue.enqueue('a', file(), async task => { task.saving(); await gate.promise; });
  await tick(); queue.cancel(queue.getSnapshot()[0].id); assert.equal(queue.getSnapshot()[0].state, 'saving'); gate.resolve(); await job;
});
test('document groups serialize knowledge processing while independent uploads can proceed', async () => {
  const queue = makeQueue(); const gate = deferred(); let secondStarted = false, independentStarted = false;
  const a = queue.enqueue('a', file(), async () => { await gate.promise; }, 'documents');
  const b = queue.enqueue('a', file(), async () => { secondStarted = true; }, 'documents');
  const c = queue.enqueue('a', file(), async () => { independentStarted = true; });
  await tick(); assert.equal(secondStarted, false); assert.equal(independentStarted, true);
  gate.resolve(); await Promise.all([a, b, c]); assert.equal(secondStarted, true);
});
test('same-post finalization runs sequentially even when transfers overlap', async () => {
  const queue = makeQueue(); const gate = deferred(); const events = [];
  const a = queue.enqueue('a', file(), task => task.finalize('post:x', async () => { events.push('first:start'); await gate.promise; events.push('first:end'); }));
  const b = queue.enqueue('a', file(), task => task.finalize('post:x', async () => { events.push('second:start'); }));
  await tick(); assert.deepEqual(events, ['first:start']); gate.resolve(); await Promise.all([a, b]);
  assert.deepEqual(events, ['first:start', 'first:end', 'second:start']);
});
test('dismissal only removes terminal rows from the specified workspace', async () => {
  const queue = makeQueue(); await Promise.all([queue.enqueue('a', file(), async () => {}), queue.enqueue('b', file(), async () => {})]);
  await tick(); queue.clearFinished('a'); assert.deepEqual(queue.getSnapshot().map(row => row.workspaceId), ['b']);
});
test('all workspace file paths use the shared queue and content uses the common transfer pipeline', () => {
  for (const file of ['CalendarGrid', 'BusinessKnowledgeCard', 'CalendarPlanStatus']) {
    const source = fs.readFileSync(`components/calendars/${file}.tsx`, 'utf8');
    assert.match(source, /workspaceUploadQueue\.enqueue/);
  }
  const grid = fs.readFileSync('components/calendars/CalendarGrid.tsx', 'utf8');
  assert.equal((grid.match(/uploadWorkspaceAsset<CalendarPostData>/g)||[]).length,2);
  assert.match(fs.readFileSync('components/calendars/CalendarWorkspaceShell.tsx', 'utf8'), /<WorkspaceUploadTray workspaceId={calendarId}/);
});
test('cancel invokes receipt release once, including cancellation while preparation is still running', async () => {
  const queue = makeQueue(); const gate = deferred(); let released = 0;
  const job = queue.enqueue('a', file(), async task => {
    await gate.promise;
    task.onCancel(async () => { released++; });
    await task.step('transfer', async () => assert.fail('cancelled transfer must not start'));
  });
  const outcome = Promise.allSettled([job]); await tick(); queue.cancel(queue.getSnapshot()[0].id); gate.resolve();
  await outcome; await tick(); assert.equal(released,1); queue.cancel(queue.getSnapshot()[0].id); assert.equal(released,1);
});
test('failed receipt release is visible without restarting a cancelled upload', async () => {
  const queue = makeQueue(); const gate = deferred();
  const job = queue.enqueue('a', file(), async task => { task.onCancel(async () => { throw Error('Automatic expiry will retry'); }); await gate.promise; });
  const outcome = Promise.allSettled([job]); await tick(); queue.cancel(queue.getSnapshot()[0].id); gate.resolve(); await outcome; await tick();
  assert.equal(queue.getSnapshot()[0].state,'cancelled'); assert.match(queue.getSnapshot()[0].error,/expiry/);
});

test('pause and immediate resume wait for the old transfer to settle without double-running or releasing quota', async () => {
  const queue=makeQueue();const gate=deferred();let runs=0,active=0,peak=0,released=0;
  const job=queue.enqueue('w',{name:'video.mp4',type:'video/mp4',size:80*1024*1024},async task=>{
    runs++;active++;peak=Math.max(peak,active);task.onCancel(async()=>released++);
    try {if(runs===1){await gate.promise;if(task.signal.aborted)throw new DOMException('Paused','AbortError');}return 'saved';}finally{active--;}
  });
  await tick();const id=queue.getSnapshot()[0].id;queue.pause(id);assert.equal(queue.getSnapshot()[0].state,'paused');queue.resume(id);await tick();assert.equal(runs,1);
  gate.resolve();assert.equal(await job,'saved');assert.equal(runs,2);assert.equal(peak,1);assert.equal(released,0);
});
