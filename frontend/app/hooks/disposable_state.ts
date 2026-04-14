import SymbolHelper from "@ephemera/shared/lib/symbol_helper";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

export function useDisposableState<T extends Disposable>(): [
  T | null,
  Dispatch<SetStateAction<T | null>>
] {
  const [resource, setResource] = useState<T | null>(null);

  useEffect(() => {
    return () => {
      if (resource) {
        resource[SymbolHelper.dispose]();
        console.debug("Disposed resource:", resource);
      }
    };
  }, [resource]);

  return [resource, setResource];
}