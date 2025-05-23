import { Module, Provider } from '@nestjs/common';
import { IStorage } from './interface';
import { RedisStorage } from './redis.storage';
import { SqliteStorage } from './sqlite.storage';
import config from '../../config';

/**
 * 設定に基づいて適切なストレージ実装を提供するプロバイダ
 */
const storageProvider: Provider = {
  provide: 'IStorage',
  useFactory: () => {
    const storageDriver = config().storage.driver;
    if (storageDriver === 'sqlite') {
      return new SqliteStorage();
    } else {
      return new RedisStorage();
    }
  }
};

@Module({
  providers: [storageProvider],
  exports: ['IStorage']
})
export class StorageModule {} 