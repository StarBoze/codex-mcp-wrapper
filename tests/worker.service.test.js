const { WorkerService } = require('../src/modules/codex/worker.service.ts');

class MockStorage {
  async init() {}
}

test('client count increases on register', () => {
  const service = new WorkerService(new MockStorage());
  service.registerClient('id1', { on() {}, send() {} });
  expect(service.getClientCount()).toBe(1);
});

test('processJob emits done message on close', async () => {
  const events = require('events');
  const childProcess = require('child_process');
  const mockSpawn = jest.spyOn(childProcess, 'spawn');

  const child = new events.EventEmitter();
  child.stdout = new events.EventEmitter();
  child.stderr = new events.EventEmitter();
  mockSpawn.mockReturnValue(child);

  const messages = [];
  const service = new WorkerService(new MockStorage());
  service.registerMcpService({ sendSSEMessage: (id, msg) => messages.push(msg) });

  const jobPromise = service['processJob']({ args: [], sseSessionId: 's1' }, 'job1');

  child.stdout.emit('data', Buffer.from('ok'));
  child.stderr.emit('data', Buffer.from('oops'));
  child.emit('close', 0);
  await jobPromise;

  expect(messages).toContainEqual({ id: 'job1', chunk: 'ok' });
  expect(messages).toContainEqual({ id: 'job1', error: 'oops' });
  expect(messages).toContainEqual({ id: 'job1', done: true, exitCode: 0 });

  mockSpawn.mockRestore();
});
