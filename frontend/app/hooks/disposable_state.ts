import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

import 'core-js/modules/es.symbol.dispose';
import 'core-js/modules/es.symbol.async-dispose';

export function useDisposableState<T extends Disposable>(): [
  T | null,
  Dispatch<SetStateAction<T | null>>
] {
  const [resource, setResource] = useState<T | null>(null);

  useEffect(() => {
    return () => {
      if (resource) {
        resource[Symbol.dispose]();
        console.debug("Disposed resource:", resource);
      }
    };
  }, [resource]);

  return [resource, setResource];
}