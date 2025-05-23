import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { CodexService } from '../codex/codex.service';
import { LimiterService } from '../rate-limit/limiter.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [McpController],
  providers: [
    McpService,
    CodexService,
    LimiterService
  ],
  exports: [McpService],
})
export class McpModule {} 