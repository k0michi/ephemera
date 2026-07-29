import { type DependencyList, useEffect, useState } from "react";

export function useAsyncMemo<T>(
  factory: () => Promise<T> | T,
  deps: DependencyList,
  initial: T
): T {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    let cancelled = false;
    const result = factory();

    if (result instanceof Promise) {
      result.then(resolved => {
        if (!cancelled) {
          setValue(resolved);
        }
      });
    } else {
      setValue(result);
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return value;
}
