import { Module } from '@nestjs/common';
import { MonitorController } from './monitor.controller';
import { WorkerModule } from '../codex/worker.module';
import { McpModule } from '../mcp/mcp.module';

@Module({
  imports: [WorkerModule, McpModule],
  controllers: [MonitorController],
})
export class MonitorModule {}
