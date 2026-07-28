import type { PostCreatedStreamEvent, PostDeletedStreamEvent, PostStreamEvent } from "@ephemera/shared/api/api.js";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocket, WebSocketServer } from "ws";

import type { IWebSocketController } from "../lib/controller.js";
import IncomingMessageHelper from "../lib/incoming_message_helper.js";
import type { IPostEventBus } from "./post_event_bus.js";

interface StreamClient {
  socket: WebSocket & { isAlive?: boolean };
  author: string | null;
}

export default class PostStreamController implements IWebSocketController {
  public path = '/post-stream';
  public static readonly kHeartbeatIntervalMs = 30_000;

  private wss: WebSocketServer;
  private clients = new Set<StreamClient>();

  constructor(postEventBus: IPostEventBus) {
    this.wss = new WebSocketServer({ noServer: true });
    this.wss.on('connection', this.handleConnection.bind(this));

    postEventBus.onEvent((event) => this.handleEvent(event));
  }

  private handleConnection(socket: WebSocket & { isAlive?: boolean }, req: IncomingMessage): void {
    const url = IncomingMessageHelper.parseURL(req);
    const client: StreamClient = { socket, author: url.searchParams.get('author') };
    this.clients.add(client);

    socket.isAlive = true;
    socket.on('pong', () => this.handlePong(client));
    socket.on('close', () => this.handleClose(client));
    socket.on('error', () => this.handleError(client));
  }

  private handlePong(client: StreamClient): void {
    client.socket.isAlive = true;
  }

  private handleClose(client: StreamClient): void {
    this.clients.delete(client);
  }

  private handleError(client: StreamClient): void {
    this.clients.delete(client);
  }

  private handleEvent(event: PostStreamEvent): void {
    switch (event.type) {
      case 'post_created':
        this.handlePostCreated(event);
        break;
      case 'post_deleted':
        this.handlePostDeleted(event);
        break;
    }
  }

  private handlePostCreated(event: PostCreatedStreamEvent): void {
    this.broadcast(event);
  }

  private handlePostDeleted(event: PostDeletedStreamEvent): void {
    this.broadcast(event);
  }

  pingClients(): void {
    for (const client of this.clients) {
      if (client.socket.isAlive === false) {
        client.socket.terminate();
        this.clients.delete(client);
        continue;
      }

      client.socket.isAlive = false;
      client.socket.ping();
    }
  }

  private broadcast(event: PostStreamEvent): void {
    const author = event.post[0][1][1];
    const payload = JSON.stringify(event);

    for (const client of this.clients) {
      if (client.author !== null && client.author !== author) {
        continue;
      }

      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(payload);
      }
    }
  }

  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
    this.wss.handleUpgrade(req, socket, head, (ws) => {
      this.wss.emit('connection', ws, req);
    });
  }
}
