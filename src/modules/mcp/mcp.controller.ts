import { Controller, Post, Get, Req, Res, Body, HttpStatus, Headers, Param, Query } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { McpService } from './mcp.service';
import * as crypto from 'crypto';
import { LimiterService } from '../rate-limit/limiter.service';

@Controller('mcp')
export class McpController {
  constructor(
    private readonly mcpService: McpService,
    private readonly limiter: LimiterService
  ) {}

  // SSE Connection endpoint
  @Get()
  async handleSSEConnection(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @Query('sessionId') sessionId: string
  ) {
    if (!sessionId) {
      return res.status(HttpStatus.BAD_REQUEST).send({ error: 'Missing sessionId parameter' });
    }

    // Set headers for SSE
    res.raw.writeHead(HttpStatus.OK, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // For Nginx proxy compatibility
    });

    // Write initial SSE message
    res.raw.write(`data: ${JSON.stringify({ type: 'connection', sessionId })}\n\n`);

    // Register the SSE connection
    this.mcpService.registerSSEConnection(sessionId, res);

    // Handle client disconnection
    req.raw.on('close', () => {
      this.mcpService.removeSSEConnection(sessionId);
    });
  }

  // Message handling endpoint for SSE clients
  @Post()
  async handleMessage(
    @Body() body: any,
    @Headers('authorization') authHeader: string,
    @Query('sessionId') sessionId: string
  ) {
    if (!sessionId) {
      return { error: 'Missing sessionId parameter' };
    }

    // Extract token from Authorization header
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return { error: 'Missing authorization token' };
    }

    try {
      // Apply rate limiting
      await this.limiter.hit(`mcp_calls:${body.method || 'unknown'}`);

      // Process the request according to MCP specification
      return await this.mcpService.processMessage(sessionId, body, token);
    } catch (error: any) {
      return { 
        error: error.message || 'Unknown error',
        id: body.id
      };
    }
  }

  // Sessions endpoint - create a new session
  @Post('sessions')
  async createSession(
    @Headers('authorization') authHeader: string
  ) {
    // Extract token from Authorization header
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return { error: 'Missing authorization token' };
    }

    // Generate a new session ID
    const sessionId = crypto.randomUUID();
    
    return {
      sessionId,
      status: 'created'
    };
  }
} 