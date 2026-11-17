const test = require('node:test');
const assert = require('node:assert/strict');
const { createApiClient } = require('../dist');

test('does not retry a POST without an idempotency key', async () => {
  let calls = 0;
  const client = createApiClient({
    baseUrl: 'https://example.test', retry: 2,
    engine: { request: async () => { calls += 1; return { data: { message: 'nope' }, status: 500, headers: {}, raw: null }; } },
  });
  const result = await client.post('/orders', { sku: '1' });
  assert.equal(calls, 1);
  assert.equal(result.error.status, 500);
});
