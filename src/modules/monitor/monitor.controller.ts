import { Controller, Get } from '@nestjs/common';
import { WorkerService } from '../codex/worker.service';
import { McpService } from '../mcp/mcp.service';

@Controller('monitor')
export class MonitorController {
  constructor(
    private readonly worker: WorkerService,
    private readonly mcp: McpService,
  ) {}

  @Get('metrics')
  getMetrics() {
    return {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      wsClients: this.worker.getClientCount(),
      sseConnections: this.mcp.getSSEConnectionCount(),
    };
  }
}
