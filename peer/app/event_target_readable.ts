import { Readable } from "node:stream";

export class EventTargetReadable extends Readable {
  private handler: ((ev: Event) => void) | null = null;

  constructor(
    private target: EventTarget,
    private eventName: string,
  ) {
    super({ objectMode: true });

    this.handler = (ev: Event) => {
      this.push(ev);
    };
    this.target.addEventListener(this.eventName, this.handler);
  }

  override _read(_size: number) {
  }

  override _destroy(err: Error | null, cb: (error?: Error | null) => void) {
    if (this.handler) {
      this.target.removeEventListener(this.eventName, this.handler);
      this.handler = null;
    }

    this.push(null);
    cb(err);
  }
}