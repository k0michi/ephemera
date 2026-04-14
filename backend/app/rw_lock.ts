import { RWLock as _RWLock } from 'async-rwlock';
import SymbolHelper from '@ephemera/shared/lib/symbol_helper.js';

/**
 * Disposable wrapper around async-rwlock.
 */
export default class RWLock {
  private _lock = new _RWLock();

  async acquireRead(timeout?: number): Promise<Disposable> {
    await this._lock.readLock(timeout);

    return {
      [SymbolHelper.dispose]: () => {
        this._lock.unlock();
      },
    };
  }

  async acquireWrite(timeout?: number): Promise<Disposable> {
    await this._lock.writeLock(timeout);

    return {
      [SymbolHelper.dispose]: () => {
        this._lock.unlock();
      },
    };
  }
}