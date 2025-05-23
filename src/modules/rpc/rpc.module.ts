import { Module } from '@nestjs/common';
import { RpcController } from './rpc.controller';
import { CodexService } from '../codex/codex.service';
import { LimiterService } from '../rate-limit/limiter.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [RpcController],
  providers: [
    CodexService,
    LimiterService
  ],
})
export class RpcModule {}
