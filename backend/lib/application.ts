import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";

import express from "express";

import type { IController, IWebSocketController } from "./controller.js";
import IncomingMessageHelper from "./incoming_message_helper.js";

function isWebSocketController(child: IController | IWebSocketController): child is IWebSocketController {
  return !('router' in child);
}

export abstract class Application {
  public app: express.Application;
  private webSocketControllers = new Map<string, IWebSocketController>();

  constructor() {
    this.app = express();
  }

  useController(controller: IController): void {
    this.app.use(controller.path, controller.router);
    this.registerChildren(controller, controller.path);
  }

  private registerChildren(controller: IController, basePath: string): void {
    for (const child of controller.children ?? []) {
      const path = `${basePath}${child.path}`;

      if (isWebSocketController(child)) {
        this.webSocketControllers.set(path, child);
      } else {
        controller.router.use(child.path, child.router);
        this.registerChildren(child, path);
      }
    }
  }

  private handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
    const { pathname } = IncomingMessageHelper.parseURL(req);
    const controller = this.webSocketControllers.get(pathname);

    if (controller) {
      controller.handleUpgrade(req, socket, head);
    } else {
      socket.destroy();
    }
  }

  listen(port: number, callback?: (error?: Error) => void): Server {
    const server = this.app.listen(port, callback);
    server.on('upgrade', (req, socket, head) => this.handleUpgrade(req, socket, head));

    return server;
  }
}
