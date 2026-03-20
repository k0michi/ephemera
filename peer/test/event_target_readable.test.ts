import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EventTargetReadable } from '../app/event_target_readable.js';

describe('EventTargetReadable', () => {
  it('should emit events from the target', async () => {
    const target = new EventTarget();
    const readable = new EventTargetReadable(target, 'test');

    const expectedValues = [1, 2, 3];
    const receivedValues: number[] = [];

    readable.on('data', (data: any) => {
      receivedValues.push(data.detail);
    });

    for (const value of expectedValues) {
      target.dispatchEvent(new CustomEvent('test', { detail: value }));
    }

    await new Promise<void>((resolve) => {
      readable.on('close', resolve);
      readable.destroy();
    });

    expect(receivedValues).toEqual(expectedValues);
  });
});