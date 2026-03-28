function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);

    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new Error('Aborted'));
    }, { once: true });
  });
}

export async function* createFixedDelayTicker(ms: number, signal: AbortSignal) {
  while (!signal.aborted) {
    await sleep(ms, signal);
    yield Date.now();
  }
}

export async function* createFixedRateWithoutSkipTicker(ms: number, signal: AbortSignal) {
  let nextTick = Date.now() + ms;

  while (!signal.aborted) {
    const delay = nextTick - Date.now();

    if (delay > 0) {
      await sleep(delay, signal);
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

    await sleep(delay, signal);

    if (signal.aborted) {
      break;
    }

    yield nextTick;
  }
}