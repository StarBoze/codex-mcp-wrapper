const { RpcController } = require('../src/modules/rpc/rpc.controller.ts');

class MockCodex {
  async enqueue() {}
  async getJob(id) { return { id }; }
}
class MockLimiter {
  async hit() {}
}

test('getJob endpoint returns job info', async () => {
  const ctrl = new RpcController(new MockCodex(), new MockLimiter());
  const res = await ctrl.getJob('xyz');
  expect(res.id).toBe('xyz');
});
