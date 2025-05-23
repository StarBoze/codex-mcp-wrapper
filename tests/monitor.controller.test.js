const { MonitorController } = require('../src/modules/monitor/monitor.controller.ts');

class MockWorker {
  getClientCount() { return 2; }
}

class MockMcp {
  getSSEConnectionCount() { return 3; }
}

test('metrics returns counts', () => {
  const ctrl = new MonitorController(new MockWorker(), new MockMcp());
  const metrics = ctrl.getMetrics();
  expect(metrics.wsClients).toBe(2);
  expect(metrics.sseConnections).toBe(3);
});
