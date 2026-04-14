import { describe, expect, it } from "vitest";
import { KeyedRWLock } from "../app/keyed_rw_lock.js";
import SymbolHelper from "@ephemera/shared/lib/symbol_helper.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('KeyedRWLock', () => {
  it('should pend write lock until read lock is released', async () => {
    const lock = new KeyedRWLock();
    const read1 = await lock.acquireRead('key1');

    let acquired = false;
    const pending = (async () => {
      const write = await lock.acquireWrite('key1');
      acquired = true;
      write[SymbolHelper.dispose]();
    })();

    await sleep(20);
    expect(acquired).toBe(false);

    read1[SymbolHelper.dispose]();

    await pending;
    expect(acquired).toBe(true);
  });

  it('should pend read lock until write lock is released', async () => {
    const lock = new KeyedRWLock();
    const write = await lock.acquireWrite('key1');

    let acquired = false;
    const pending = (async () => {
      const read1 = await lock.acquireRead('key1');
      acquired = true;
      read1[SymbolHelper.dispose]();
    })();

    await sleep(20);
    expect(acquired).toBe(false);

    write[SymbolHelper.dispose]();

    await pending;
    expect(acquired).toBe(true);
  });

  it('should allow multiple readers', async () => {
    const lock = new KeyedRWLock();

    const read1 = await lock.acquireRead('key1');

    let acquiredSecondRead = false;
    const pending = (async () => {
      const read2 = await lock.acquireRead('key1');
      acquiredSecondRead = true;
      read2[SymbolHelper.dispose]();
    })();

    await sleep(20);
    expect(acquiredSecondRead).toBe(true);

    read1[SymbolHelper.dispose]();
    await pending;
  });
});