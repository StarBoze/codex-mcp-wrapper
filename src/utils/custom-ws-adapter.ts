import { WebSocketAdapter } from '@nestjs/common';
import { MessageMappingProperties } from '@nestjs/websockets';
import * as WebSocket from 'ws';
import { Observable, fromEvent, EMPTY } from 'rxjs';
import { mergeMap, filter } from 'rxjs/operators';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

export class CustomWebSocketAdapter implements WebSocketAdapter {
  constructor(private readonly app: NestFastifyApplication) {}

  create(port: number, options: any = {}): WebSocket.Server {
    console.log(`Creating WebSocket server on port ${port} with options:`, options);
    return new WebSocket.Server({
      server: this.app.getHttpServer(),
      path: options.path || '/ws',
    });
  }

  bindClientConnect(server: WebSocket.Server, callback: (client: WebSocket) => void): void {
    console.log('Binding client connect event');
    server.on('connection', callback);
  }

  bindMessageHandlers(
    client: WebSocket,
    handlers: MessageMappingProperties[],
    process: (data: any) => Observable<any>,
  ): void {
    fromEvent(client, 'message')
      .pipe(
        mergeMap(data => this.handleMessage(client, data, handlers, process)),
        filter(result => result),
      )
      .subscribe();
  }

  close(server: WebSocket.Server): void {
    server.close();
  }

  private handleMessage(
    client: WebSocket,
    message: any,
    handlers: MessageMappingProperties[],
    process: (data: any) => Observable<any>,
  ): Observable<any> {
    let messageData;
    try {
      messageData = JSON.parse(message.data);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      return EMPTY;
    }

    const messageEvent = messageData.event;
    if (!messageEvent) {
      return EMPTY;
    }

    const handler = handlers.find(h => h.message === messageEvent);
    if (!handler) {
      return EMPTY;
    }

    return process(handler.callback(messageData.data));
  }
} 