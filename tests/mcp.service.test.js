const jwt = require('jsonwebtoken');
const { McpService } = require('../src/modules/mcp/mcp.service.ts');

class MockCodexService {
  enqueue() { return Promise.resolve({ id: '1' }); }
}

process.env.JWT_SECRET = 'test-secret';
const token = jwt.sign({ user: 'test' }, process.env.JWT_SECRET);

const mcp = new McpService(new MockCodexService());

test('listTools returns tool list', async () => {
  const body = { method: 'listTools', params: {}, id: '123' };
  const res = await mcp.processMessage('session', body, token);
  expect(res.tools[0].name).toBe('codex');
});
