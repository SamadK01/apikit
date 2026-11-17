const test = require('node:test');
const assert = require('node:assert/strict');
const { executeAgentTool } = require('../dist');

test('corrects invalid tool arguments and captures provider telemetry', async () => {
  const payloads = [];
  const client = {
    post: async (_url, payload) => {
      payloads.push(payload);
      const argumentsValue = payloads.length === 1 ? '{bad json' : '{"city":"Karachi"}';
      return {
        data: { choices: [{ message: { tool_calls: [{ function: { arguments: argumentsValue } }] } }] },
        error: null,
        raw: { headers: { 'x-usage-total-tokens': '21', 'x-request-id': 'req_123' } },
      };
    },
  };
  const schema = {
    jsonSchema: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'], additionalProperties: false },
    safeParse(value) {
      return typeof value?.city === 'string' ? { success: true, data: value } : { success: false, error: 'city required' };
    },
  };
  const result = await executeAgentTool({ endpoint: '/agent', name: 'weather', description: 'Get weather', schema }, { prompt: 'weather?' }, {}, client);
  assert.deepEqual(result.data, { city: 'Karachi' });
  assert.equal(result.attempts, 2);
  assert.equal(result.telemetry.totalTokens, 21);
  assert.equal(payloads[1].correction.tool_name, 'weather');
});
