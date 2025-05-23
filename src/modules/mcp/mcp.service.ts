import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import { FastifyReply } from 'fastify';
import { CodexService } from '../codex/codex.service';
import * as jwt from 'jsonwebtoken';
import config from '../../config';

interface McpRequest {
  method: string;
  params: Record<string, any>;
  id: string;
}

@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);
  private sseConnections = new Map<string, FastifyReply>();
  private jobSessionMap = new Map<string, string>();
  private capabilities: any[] | null = null;

  constructor(private readonly codexService: CodexService) {}

  registerSSEConnection(sessionId: string, res: FastifyReply) {
    this.sseConnections.set(sessionId, res);
    this.logger.log(`SSE connection registered: ${sessionId}`);
  }

  removeSSEConnection(sessionId: string) {
    this.sseConnections.delete(sessionId);
    this.logger.log(`SSE connection removed: ${sessionId}`);
  }

  /**
   * 現在のSSE接続数を取得
   */
  getSSEConnectionCount(): number {
    return this.sseConnections.size;
  }

  async processMessage(sessionId: string, message: McpRequest, token: string): Promise<any> {
    try {
      // Verify JWT token
      const user = jwt.verify(token, config().jwtSecret);
      
      // Process based on MCP protocol
      if (message.method === 'callTool' && message.params?.name === 'codex') {
        return this.handleCodexToolCall(sessionId, message);
      }
      
      // Example of other MCP method handlers
      if (message.method === 'listTools') {
        return this.handleListTools(message);
      }
      
      throw new Error(`Unsupported method: ${message.method}`);
    } catch (error: any) {
      this.logger.error(`Error processing message: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleCodexToolCall(sessionId: string, message: McpRequest): Promise<any> {
    try {
      const args = message.params.arguments?.args || [];
      
      // Enqueue the job in BullMQ
      const job = await this.codexService.enqueue('codex', { args, sseSessionId: sessionId });
      
      // Map job ID to session ID for callbacks
      if (job && job.id) {
        const jobId = job.id.toString();
        this.jobSessionMap.set(jobId, sessionId);
        return { id: message.id, jobId };
      }
      
      throw new Error('Failed to create job');
    } catch (error: any) {
      this.logger.error(`Error handling Codex tool call: ${error.message}`, error.stack);
      throw error;
    }
  }

  private loadCapabilities(): any[] {
    if (this.capabilities) {
      return this.capabilities;
    }
    const file = config().capabilitiesFile;
    try {
      const raw = fs.readFileSync(file, 'utf8');
      const parsed = JSON.parse(raw);
      this.capabilities = parsed.tools || [];
    } catch (err: any) {
      this.logger.error(`Failed to load capabilities from ${file}: ${err.message}`);
      this.capabilities = [];
    }
    return this.capabilities || [];
  }

  private handleListTools(message: McpRequest): any {
    return {
      id: message.id,
      tools: this.loadCapabilities()
    };
  }

  sendSSEMessage(sessionId: string, data: any) {
    try {
      const connection = this.sseConnections.get(sessionId);
      if (connection) {
        // Format as SSE message
        connection.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    } catch (error: any) {
      this.logger.error(`Error sending SSE message: ${error.message}`, error.stack);
    }
  }

  getSessionByJobId(jobId: string): string | undefined {
    return this.jobSessionMap.get(jobId);
  }
} 