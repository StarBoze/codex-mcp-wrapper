import { Module, MiddlewareConsumer, NestModule, OnModuleInit, Inject } from '@nestjs/common';
import { RpcModule } from './rpc/rpc.module';
import { WsModule } from './ws/ws.module';
import { McpModule } from './mcp/mcp.module';
import { StorageModule } from './storage/storage.module';
import { WorkerModule } from './codex/worker.module';
import { MonitorModule } from './monitor/monitor.module';
import { AuthMiddleware } from './auth/auth.middleware';
import { IStorage } from './storage/interface';
import { Logger } from '@nestjs/common';

@Module({
  imports: [RpcModule, WsModule, McpModule, StorageModule, WorkerModule, MonitorModule],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule, OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(@Inject('IStorage') private readonly storage: IStorage) {}

  /**
   * モジュール初期化時にストレージを初期化
   */
  async onModuleInit() {
    try {
      await this.storage.init();
      this.logger.log('Storage initialized successfully');
    } catch (error: any) {
      this.logger.error(`Failed to initialize storage: ${error.message}`, error.stack);
      // 重大なエラーなのでアプリケーションを終了
      process.exit(1);
    }
  }
  
  configure(consumer: MiddlewareConsumer) {
    // Apply auth middleware to all routes except WebSocket and MCP
    consumer
      .apply(AuthMiddleware)
      .exclude('ws', 'mcp')
      .forRoutes('*');
  }
}
