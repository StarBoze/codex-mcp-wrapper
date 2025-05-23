import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayInit } from '@nestjs/websockets';
import * as WebSocket from 'ws';
import * as crypto from 'crypto';
import { registerClient } from '../codex/codex.worker';

@WebSocketGateway({
  path: '/ws',
})
export class WsGateway implements OnGatewayConnection, OnGatewayInit {
  @WebSocketServer()
  server!: WebSocket.Server;

  afterInit(server: WebSocket.Server) {
    console.log('WebSocket server initialized on path /ws');
  }

  handleConnection(client: WebSocket) {
    try {
    const wsId = crypto.randomUUID();
      console.log(`Client connected with WebSocket ID: ${wsId}`);
    registerClient(wsId, client);
      client.send(JSON.stringify({ type: 'connection', wsId }));
    } catch (error) {
      console.error('Error handling WebSocket connection:', error);
    }
  }

  @SubscribeMessage('ping')
  handlePing(client: WebSocket) {
    try {
      client.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
    } catch (error) {
      console.error('Error handling ping message:', error);
    }
  }
}
