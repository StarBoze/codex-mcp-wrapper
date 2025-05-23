import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import { spawn } from 'child_process';
import WebSocket from 'ws';
import Redis from 'ioredis';
import { IStorage } from '../storage/interface';
import { streamChildToWS } from '../../utils/streamToWebsocket';
import config from '../../config';

// Map to store WebSocket clients
const clientMap = new Map<string, WebSocket>();
// Centralized logger
const logger = new Logger('CodexWorker');

// Keep track of MCP service for SSE streaming
let mcpServiceInstance: any = null;

@Injectable()
export class WorkerService implements OnModuleInit {
  private worker: Worker | null = null;
  private redisClient: Redis | null = null;
  private sqlitePoller: NodeJS.Timeout | null = null;
  private readonly logger = new Logger(WorkerService.name);
  private isRunning = false;

  constructor(
    @Inject('IStorage') private readonly storage: IStorage
  ) {}

  /**
   * モジュール初期化時にワーカーを起動
   */
  async onModuleInit() {
    await this.startWorker();
  }

  /**
   * WebSocketクライアントを登録
   */
  registerClient(id: string, ws: WebSocket) {
    clientMap.set(id, ws);
    ws.on('close', () => clientMap.delete(id));
    this.logger.log(`WebSocket client registered: ${id}`);
  }

  /**
   * 登録されているWebSocketクライアント数を取得
   */
  getClientCount(): number {
    return clientMap.size;
  }

  /**
   * MCPサービスを登録（SSEストリーミング用）
   */
  registerMcpService(mcpService: any) {
    mcpServiceInstance = mcpService;
    this.logger.log('MCP Service registered for SSE streaming');
  }

  /**
   * ストレージタイプに応じたワーカーを起動
   */
  async startWorker() {
    try {
      if (this.isRunning) {
        return;
      }

      const storageDriver = config().storage.driver;

      if (storageDriver === 'redis') {
        await this.startRedisWorker();
      } else if (storageDriver === 'sqlite') {
        await this.startSqliteWorker();
      } else {
        throw new Error(`Unsupported storage driver: ${storageDriver}`);
      }

      this.isRunning = true;
      this.logger.log(`Codex worker started with ${storageDriver} storage`);
    } catch (error: any) {
      this.logger.error(`Failed to start Codex worker: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Redis + BullMQベースのワーカーを起動
   */
  private async startRedisWorker() {
    try {
      this.redisClient = new Redis(config().storage.redisUrl, {
        maxRetriesPerRequest: null,
        retryStrategy: (times) => {
          const delay = Math.min(times * 100, 3000);
          this.logger.warn(`Redis connection attempt ${times} failed. Retrying in ${delay}ms...`);
          return delay;
        }
      });

      this.redisClient.on('error', (err: Error) => {
        this.logger.error(`Redis connection error: ${err.message}`, err.stack);
      });

      this.worker = new Worker(
        'codex-queue',
        async job => {
          try {
            return await this.processJob(job.data, job.id?.toString());
          } catch (error: any) {
            this.logger.error(`Error processing job: ${error.message}`, error.stack);
            throw error;
          }
        },
        { 
          connection: this.redisClient,
          autorun: true
        }
      );
    } catch (error: any) {
      this.logger.error(`Failed to start Redis worker: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * SQLiteベースのワーカーをポーリングで起動
   */
  private async startSqliteWorker() {
    try {
      // SQLiteの場合は定期的にジョブをポーリング
      if (this.sqlitePoller) {
        clearInterval(this.sqlitePoller);
      }

      // SQLiteストレージの場合はキャスト（型安全のため）
      const sqliteStorage = this.storage as any;
      
      if (!sqliteStorage.getPendingJobs) {
        throw new Error('SQLite storage implementation does not have getPendingJobs method');
      }

      this.sqlitePoller = setInterval(async () => {
        try {
          // 保留中のジョブを取得して処理
          const pendingJobs = await sqliteStorage.getPendingJobs(5);
          
          for (const job of pendingJobs) {
            try {
              // ジョブのステータスを処理中に更新
              await sqliteStorage.updateJobStatus(job.id, 'processing');
              
              // ジョブを実行
              const result = await this.processJob(JSON.parse(job.data), job.id);
              
              // 成功したらステータスを完了に更新
              await sqliteStorage.updateJobStatus(job.id, 'completed');
            } catch (error: any) {
              // 失敗したらエラーステータスに更新
              this.logger.error(`Error processing job ${job.id}: ${error.message}`, error.stack);
              await sqliteStorage.updateJobStatus(job.id, 'failed');
            }
          }
        } catch (error: any) {
          this.logger.error(`Error in SQLite job polling: ${error.message}`, error.stack);
        }
      }, 1000); // 1秒ごとにポーリング
    } catch (error: any) {
      this.logger.error(`Failed to start SQLite worker: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 実際のジョブ処理ロジック（ストレージに依存しない）
   */
  private async processJob(data: any, jobId?: string): Promise<number> {
    const { args, wsId, sseSessionId } = data as {
      args: string[];
      wsId?: string;
      sseSessionId?: string;
    };

    this.logger.log(`Processing job ${jobId}: args=${args.join(' ')}`);
    
    const child = spawn('codex', args, { 
      env: { ...process.env, OPENAI_API_KEY: config().codex.apiKey } 
    });
    
    // WebSocketストリーミング
    if (wsId && jobId) {
      const ws = clientMap.get(wsId);
      if (ws) {
        this.logger.log(`Streaming output to WebSocket client ${wsId}`);
        streamChildToWS(child, ws, jobId);
      } else {
        this.logger.warn(`WebSocket client ${wsId} not found for job ${jobId}`);
      }
    } 
    
    // SSEストリーミング
    if (sseSessionId && jobId && mcpServiceInstance) {
      this.logger.log(`Streaming output to SSE session ${sseSessionId}`);

      // Set up stdout streaming
      child.stdout.on('data', chunk => {
        mcpServiceInstance.sendSSEMessage(sseSessionId, {
          id: jobId,
          chunk: chunk.toString()
        });
      });

      // Set up stderr streaming
      child.stderr.on('data', chunk => {
        mcpServiceInstance.sendSSEMessage(sseSessionId, {
          id: jobId,
          error: chunk.toString()
        });
      });
    }

    return await new Promise<number>(resolve => {
      child.on('close', code => {
        if (sseSessionId && jobId && mcpServiceInstance) {
          mcpServiceInstance.sendSSEMessage(sseSessionId, {
            id: jobId,
            done: true,
            exitCode: code
          });
        }
        resolve(code ?? 0);
      });
    });
  }

  /**
   * アプリケーション終了時にリソースを解放
   */
  async onModuleDestroy() {
    try {
      if (this.worker) {
        await this.worker.close();
      }
      
      if (this.redisClient) {
        await this.redisClient.quit();
      }
      
      if (this.sqlitePoller) {
        clearInterval(this.sqlitePoller);
      }
      
      this.logger.log('Worker resources released');
    } catch (error: any) {
      this.logger.error(`Error shutting down worker: ${error.message}`, error.stack);
    }
  }
} 