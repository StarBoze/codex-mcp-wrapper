import { IStorage } from './interface';
import { Logger } from '@nestjs/common';
import { open, Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import * as crypto from 'crypto';
import config from '../../config';

/**
 * SQLite を使用したストレージ実装
 * 単一サーバーデプロイ向け
 */
export class SqliteStorage implements IStorage {
  private db: Database | null = null;
  private readonly logger = new Logger(SqliteStorage.name);

  /**
   * SQLiteデータベースを初期化し、必要なテーブルを作成
   */
  async init() {
    try {
      this.db = await open({
        filename: config().storage.sqliteFile,
        driver: sqlite3.Database
      });

      // ジョブ管理テーブル
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS jobs (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          data TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at INTEGER,
          updated_at INTEGER
        );
      `);

      // レートリミット管理テーブル
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS rate_limit (
          key TEXT PRIMARY KEY,
          count INTEGER NOT NULL,
          window_start INTEGER NOT NULL
        );
      `);

      this.logger.log('SQLite storage initialized successfully');
    } catch (error: any) {
      this.logger.error(`Failed to initialize SQLite storage: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * SQLiteにジョブを保存
   * @param jobType - ジョブの種類
   * @param data - ジョブデータ
   * @returns ジョブID
   */
  async enqueue(jobType: string, data: any) {
    if (!this.db) {
      throw new Error('SQLite database not initialized');
    }

    try {
      const id = crypto.randomUUID();
      const now = Date.now();

      await this.db.run(
        `INSERT INTO jobs (id, type, data, status, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        id, jobType, JSON.stringify(data), 'pending', now, now
      );

      this.logger.debug(`Job enqueued: ${id} (${jobType})`);
      return id;
    } catch (error: any) {
      this.logger.error(`Failed to enqueue job '${jobType}': ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * SQLiteを使用してレートリミットを実装
   * @param key - レートリミット用のキー
   * @throws Error - レート制限を超えた場合
   */
  async hitRate(key: string) {
    if (!this.db) {
      throw new Error('SQLite database not initialized');
    }

    try {
      // トランザクションを開始
      await this.db.run('BEGIN TRANSACTION');
      
      const now = Date.now();
      const windowDuration = 60 * 1000; // 1分（ミリ秒）
      
      // 現在のレート情報を取得
      const row = await this.db.get(
        `SELECT count, window_start FROM rate_limit WHERE key = ?`,
        key
      );
      
      let count = 1;
      let windowStart = now;
      
      if (row) {
        // 既存のウィンドウ内であればカウント増加、新しいウィンドウであればリセット
        if (now - row.window_start < windowDuration) {
          count = row.count + 1;
          windowStart = row.window_start;
        }
      }
      
      // レート制限チェック
      if (count > config().rateLimit.rpm) {
        await this.db.run('ROLLBACK');
        throw new Error('Rate limit exceeded');
      }
      
      // レート情報を更新または新規作成
      await this.db.run(
        `INSERT INTO rate_limit (key, count, window_start) 
         VALUES (?, ?, ?) 
         ON CONFLICT(key) DO UPDATE SET count = ?, window_start = ?`,
        key, count, windowStart, count, windowStart
      );
      
      await this.db.run('COMMIT');
    } catch (error: any) {
      await this.db.run('ROLLBACK');
      
      if (error.message === 'Rate limit exceeded') {
        throw error;
      }
      
      this.logger.error(`Error in hitRate: ${error.message}`, error.stack);
      throw new Error(`Rate limiting error: ${error.message}`);
    }
  }

  /**
   * 保留中のジョブを取得
   * Worker実装用（必要に応じて）
   */
  async getPendingJobs(limit = 10) {
    if (!this.db) {
      throw new Error('SQLite database not initialized');
    }

    try {
      return await this.db.all(
        `SELECT id, type, data FROM jobs 
         WHERE status = 'pending' 
         ORDER BY created_at ASC 
         LIMIT ?`,
        limit
      );
    } catch (error: any) {
      this.logger.error(`Failed to get pending jobs: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * ジョブのステータスを更新
   * Worker実装用（必要に応じて）
   */
  async updateJobStatus(id: string, status: string) {
    if (!this.db) {
      throw new Error('SQLite database not initialized');
    }

    try {
      await this.db.run(
        `UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?`,
        status, Date.now(), id
      );
    } catch (error: any) {
      this.logger.error(`Failed to update job status: ${error.message}`, error.stack);
      throw error;
    }
  }
} 