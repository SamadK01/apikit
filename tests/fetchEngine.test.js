const test = require('node:test');
const assert = require('node:assert/strict');
const { fetchEngine } = require('../dist');

test('fetch engine applies a timeout even with a caller signal', async () => {
  const originalFetch = global.fetch;
  global.fetch = (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
  });
  try {
    await assert.rejects(fetchEngine.request({ url: 'https://example.test', timeout: 5, signal: new AbortController().signal }), error => error.isTimeout === true);
  } finally {
    global.fetch = originalFetch;
  }
});
