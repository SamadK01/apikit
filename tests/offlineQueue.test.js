const test = require('node:test');
const assert = require('node:assert/strict');
const { offlineQueue } = require('../dist');

test('does not enqueue the same idempotent mutation twice', async () => {
  await offlineQueue.clear();
  const first = await offlineQueue.add({ url: '/likes/1', method: 'POST', idempotencyKey: 'like-1' });
  const second = await offlineQueue.add({ url: '/likes/1', method: 'POST', idempotencyKey: 'like-1' });
  assert.equal(first, second);
  assert.equal((await offlineQueue.getPending()).length, 1);
  await offlineQueue.clear();
});
