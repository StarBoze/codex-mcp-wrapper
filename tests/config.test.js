const config = require('../src/config.ts').default;

test('config caching', () => {
  const a = config();
  const b = config();
  expect(a).toBe(b);
});

test('rpm reads from env', () => {
  jest.resetModules();
  process.env.RATE_LIMIT_RPM = '42';
  const cfg = require('../src/config.ts').default();
  expect(cfg.rateLimit.rpm).toBe(42);
  delete process.env.RATE_LIMIT_RPM;
  jest.resetModules();
});
