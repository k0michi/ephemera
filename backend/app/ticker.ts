import { setTimeout } from 'timers/promises';

export async function* createFixedDelayTicker(ms: number, signal: AbortSignal) {
  while (!signal.aborted) {
    await setTimeout(ms, undefined, { signal });
    yield Date.now();
  }
}

export async function* createFixedRateWithoutSkipTicker(ms: number, signal: AbortSignal) {
  let nextTick = Date.now() + ms;

  while (!signal.aborted) {
    const delay = nextTick - Date.now();

    if (delay > 0) {
      await setTimeout(delay, undefined, { signal });
    }

    if (signal.aborted) {
      break;
    }

    yield Date.now();

    nextTick += ms;
  }
}

export async function* createFixedRateWithSkipTicker(ms: number, signal: AbortSignal) {
  while (!signal.aborted) {
    const now = Date.now();
    const nextTick = Math.ceil((now + 1) / ms) * ms;
    const delay = nextTick - now;

    await setTimeout(delay, undefined, { signal });

    if (signal.aborted) {
      break;
    }

    yield nextTick;
  }
}