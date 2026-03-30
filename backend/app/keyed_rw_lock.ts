import RWLock from './rw_lock.js';

export class KeyedRWLock {
  private entries = new Map<string, { lock: RWLock; ref: number }>();

  private getOrCreate(key: string) {
    let entry = this.entries.get(key);

    if (!entry) {
      entry = { lock: new RWLock(), ref: 0 };
      this.entries.set(key, entry);
    }

    return entry;
  }

  private releaseRef(key: string) {
    const entry = this.entries.get(key);

    if (entry) {
      entry.ref--;

      if (entry.ref <= 0) {
        this.entries.delete(key);
      }
    }
  }

  async acquireRead(key: string, timeout?: number): Promise<Disposable> {
    const entry = this.getOrCreate(key);
    entry.ref++;
    try {
      const release = await entry.lock.acquireRead(timeout);

      return {
        [Symbol.dispose]: () => {
          release[Symbol.dispose]();
          this.releaseRef(key);
        },
      };
    } catch (e) {
      this.releaseRef(key);
      throw e;
    }
  }

  async acquireWrite(key: string, timeout?: number): Promise<Disposable> {
    const entry = this.getOrCreate(key);
    entry.ref++;

    try {
      const release = await entry.lock.acquireWrite(timeout);

      return {
        [Symbol.dispose]: () => {
          release[Symbol.dispose]();
          this.releaseRef(key);
        },
      };
    } catch (e) {
      this.releaseRef(key);
      throw e;
    }
  }
}