const { LimiterService } = require('../src/modules/rate-limit/limiter.service.ts');

class MockStorage {
  constructor() { this.count = 0; }
  async hitRate() { this.count += 1; }
}

test('limiter forwards hit to storage', async () => {
  const storage = new MockStorage();
  const limiter = new LimiterService(storage);
  await limiter.hit('key');
  expect(storage.count).toBe(1);
});
