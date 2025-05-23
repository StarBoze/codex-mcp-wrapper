import { IStorage } from './interface';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { Logger } from '@nestjs/common';
import config from '../../config';

/**
 * Redis を使用したストレージ実装
 * BullMQ と ioredis を使用
 */
export class RedisStorage implements IStorage {
  private queue!: Queue;
  private redis!: Redis;
  private readonly logger = new Logger(RedisStorage.name);

  /**
   * Redis接続を初期化し、Queueを作成
   */
  async init() {
    try {
      this.redis = new Redis(config().storage.redisUrl, {
        maxRetriesPerRequest: null,
        retryStrategy: (times) => {
          const delay = Math.min(times * 100, 3000);
          this.logger.warn(`Redis connection attempt ${times} failed. Retrying in ${delay}ms...`);
          return delay;
        }
      });

      this.redis.on('error', (err: Error) => {
        this.logger.error(`Redis connection error: ${err.message}`, err.stack);
      });

      this.queue = new Queue('codex-queue', { connection: this.redis });
      this.logger.log('Redis storage initialized successfully');
    } catch (error: any) {
      this.logger.error(`Failed to initialize Redis storage: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * BullMQのジョブキューにジョブを追加
   * @param jobType - ジョブの種類
   * @param data - ジョブデータ
   * @returns ジョブID
   */
  async enqueue(jobType: string, data: any) {
    try {
      const job = await this.queue.add(jobType, data);
      return job.id ? job.id.toString() : '';
    } catch (error: any) {
      this.logger.error(`Failed to enqueue job '${jobType}': ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Redisを使用してレートリミットを実装
   * @param key - レートリミット用のキー
   * @throws Error - レート制限を超えた場合
   */
  async hitRate(key: string) {
    try {
      const multi = this.redis.multi();
      multi.incr(key);
      multi.expire(key, 60); // 1分間の有効期限
      const [countError, count] = await multi.exec() || [null, 0];
      
      if (countError) {
        throw countError;
      }
      
      if (Number(count) > config().rateLimit.rpm) {
        throw new Error('Rate limit exceeded');
      }
    } catch (error: any) {
      if (error.message === 'Rate limit exceeded') {
        throw error;
      }
      this.logger.error(`Error in hitRate: ${error.message}`, error.stack);
      throw new Error(`Rate limiting error: ${error.message}`);
    }
  }
} 