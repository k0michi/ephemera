import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";

import { Router } from "express";

export interface IController {
  path: string;
  router: Router;
  children?: (IController | IWebSocketController)[];
}

export interface IWebSocketController {
  path: string;
  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void;
}
