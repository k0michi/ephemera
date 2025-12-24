import express from "express";
import type { IController } from "./controller.js";

export abstract class Application {
  public app: express.Application;

  constructor() {
    this.app = express();
  }

  useController(controller: IController): void {
    this.app.use(controller.path, controller.router);
  }

  listen(port: number, callback?: (error?: Error) => void) {
    return this.app.listen(port, callback);
  }
}