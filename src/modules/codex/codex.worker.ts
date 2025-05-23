// このファイルは後方互換性のために残しています
// 新しい実装は worker.service.ts を参照してください

import { Worker } from 'bullmq';
import { spawn } from 'child_process';
import WebSocket from 'ws';
import Redis from 'ioredis';
import { Logger } from '@nestjs/common';
import { streamChildToWS } from '../../utils/streamToWebsocket';
import config from '../../config';

// Map to store WebSocket clients
const clientMap = new Map<string, WebSocket>();
// Centralized logger
const logger = new Logger('CodexWorker');

// WorkerServiceのインスタンスは後で初期化します
let workerServiceInstance: any = null;

// 初期化前にMCPサービスが登録された場合のための一時保存
let pendingMcpService: any = null;

/**
 * WebSocketクライアントを登録
 * @param id WebSocketクライアントID
 * @param ws WebSocketインスタンス
 */
export function registerClient(id: string, ws: WebSocket) {
  if (workerServiceInstance) {
    workerServiceInstance.registerClient(id, ws);
  } else {
    // フォールバックとして直接登録（初期化前）
    clientMap.set(id, ws);
    ws.on('close', () => clientMap.delete(id));
    logger.log(`WebSocket client registered: ${id}`);
  }
}

/**
 * MCPサービスをワーカーに登録
 * @param mcpService MCPサービスインスタンス
 */
export function registerMcpService(mcpService: any) {
  if (workerServiceInstance) {
    workerServiceInstance.registerMcpService(mcpService);
  } else {
    logger.warn('WorkerService not initialized yet, MCP service registration delayed');
    // 次回startWorker呼び出し時にセットされるよう保存
    pendingMcpService = mcpService;
  }
}

export function startWorker() {
  logger.log('Legacy startWorker function called, WorkerService should be used instead');
}

/**
 * WorkerServiceインスタンスを設定（AppModule初期化時に呼び出される）
 * @param workerService WorkerServiceインスタンス
 */
export function setWorkerService(workerService: any) {
  workerServiceInstance = workerService;
  
  // 保留中のMCPサービスがあれば登録
  if (pendingMcpService) {
    workerServiceInstance.registerMcpService(pendingMcpService);
    pendingMcpService = null;
  }
  
  // 既に登録されたWebSocketクライアントを転送
  for (const [id, ws] of clientMap.entries()) {
    workerServiceInstance.registerClient(id, ws);
  }
  
  logger.log('WorkerService instance set');
}
