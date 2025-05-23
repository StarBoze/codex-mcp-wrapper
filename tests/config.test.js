const config = require('../src/config.ts').default;

test('config caching', () => {
  const a = config();
  const b = config();
  expect(a).toBe(b);
});
