import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './modules/app.module';
import config from './config';
import { setWorkerService } from './modules/codex/codex.worker';
import { CustomWebSocketAdapter } from './utils/custom-ws-adapter';
import { McpService } from './modules/mcp/mcp.service';
import { WorkerService } from './modules/codex/worker.service';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );
  
  // Use custom WebSocket adapter
  app.useWebSocketAdapter(new CustomWebSocketAdapter(app));
  
  const cfg = config();
  await app.listen(cfg.port, '0.0.0.0');
  console.log(`Wrapper listening on port ${cfg.port} with WebSocket and SSE support`);
  console.log(`Storage driver: ${cfg.storage.driver}`);
  
  // Get service instances
  const mcpService = app.get(McpService);
  const workerService = app.get(WorkerService);
  
  // Register services for backward compatibility
  setWorkerService(workerService);
  workerService.registerMcpService(mcpService);
}
bootstrap();
