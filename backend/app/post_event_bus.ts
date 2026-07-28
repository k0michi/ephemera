import type { PostStreamEvent } from "@ephemera/shared/api/api.js";
import { EventEmitter } from "node:events";

export interface IPostEventBus {
  emitEvent(event: PostStreamEvent): void;

  onEvent(listener: (event: PostStreamEvent) => void): void;

  offEvent(listener: (event: PostStreamEvent) => void): void;
}

export class PostEventBus implements IPostEventBus {
  private emitter = new EventEmitter();
  private static readonly kEventName = 'event';

  emitEvent(event: PostStreamEvent): void {
    this.emitter.emit(PostEventBus.kEventName, event);
  }

  onEvent(listener: (event: PostStreamEvent) => void): void {
    this.emitter.on(PostEventBus.kEventName, listener);
  }

  offEvent(listener: (event: PostStreamEvent) => void): void {
    this.emitter.off(PostEventBus.kEventName, listener);
  }
}
