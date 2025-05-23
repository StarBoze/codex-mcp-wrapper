import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { WorkerService } from './worker.service';

@Module({
  imports: [StorageModule],
  providers: [WorkerService],
  exports: [WorkerService]
})
export class WorkerModule {} 