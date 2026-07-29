import SymbolHelper from "@ephemera/shared/lib/symbol_helper";
import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from "react";

export function useDisposableState<T extends Disposable>(): [
  T | null,
  Dispatch<SetStateAction<T | null>>
] {
  const [resource, setResourceState] = useState<T | null>(null);
  const resourceRef = useRef<T | null>(null);

  const setResource = useCallback<Dispatch<SetStateAction<T | null>>>(action => {
    const prev = resourceRef.current;
    const next = typeof action === "function"
      ? (action as (prev: T | null) => T | null)(prev)
      : action;

    if (prev && prev !== next) {
      prev[SymbolHelper.dispose]();
    }

    resourceRef.current = next;
    setResourceState(next);
  }, []);

  useEffect(() => {
    return () => {
      if (resourceRef.current) {
        resourceRef.current[SymbolHelper.dispose]();
      }
    };
  }, []);

  return [resource, setResource];
}