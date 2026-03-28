import { RWLock as _RWLock } from 'async-rwlock';

/**
 * Disposable wrapper around async-rwlock.
 */
export default class RWLock {
  private _lock = new _RWLock();

  async acquireRead(timeout?: number): Promise<Disposable> {
    await this._lock.readLock(timeout);

    return {
      [Symbol.dispose]: () => {
        this._lock.unlock();
      },
    };
  }

  async acquireWrite(timeout?: number): Promise<Disposable> {
    await this._lock.writeLock(timeout);

    return {
      [Symbol.dispose]: () => {
        this._lock.unlock();
      },
    };
  }
}