const { CodexService } = require('../src/modules/codex/codex.service.ts');

class MockStorage {
  async getJob(id) { return { id, status: 'completed' }; }
}

test('getJob forwards to storage', async () => {
  const svc = new CodexService(new MockStorage());
  const job = await svc.getJob('j1');
  expect(job.id).toBe('j1');
  expect(job.status).toBe('completed');
});
