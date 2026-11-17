const test = require('node:test');
const assert = require('node:assert/strict');
const { parseRetryAfter, calculateBackoffWithJitter } = require('../dist');

test('parses standard and provider retry headers', () => {
  assert.equal(parseRetryAfter({ 'Retry-After': '2' }), 2000);
  assert.equal(parseRetryAfter({ 'x-ratelimit-reset-requests': '250ms' }), 250);
  assert.equal(parseRetryAfter({}), null);
});

test('backoff remains bounded', () => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const delay = calculateBackoffWithJitter(attempt, 300, 1000);
    assert.ok(delay >= 100 && delay <= 1000);
  }
});
