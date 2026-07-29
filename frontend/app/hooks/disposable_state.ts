import SymbolHelper from "@ephemera/shared/lib/symbol_helper";
import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from "react";

export function useDisposableState<T extends Disposable>(): [
  T | null,
  Dispatch<SetStateAction<T | null>>
] {
  const [resource, setResourceState] = useState<T | null>(null);
  const requestedRef = useRef<T | null>(null);
  const committedRef = useRef<T | null>(null);

  const setResource = useCallback<Dispatch<SetStateAction<T | null>>>(action => {
    const prev = requestedRef.current;
    const next = typeof action === "function"
      ? (action as (prev: T | null) => T | null)(prev)
      : action;

    if (prev && prev !== next && prev !== committedRef.current) {
      // setResource has been called multiple times in a single tick
      prev[SymbolHelper.dispose]();
    }

    requestedRef.current = next;
    setResourceState(next);
  }, []);

  useEffect(() => {
    // resource is the value that is going to be rendered, and it should be clean up in the destruction callback
    committedRef.current = resource;

    return () => {
      if (resource) {
        resource[SymbolHelper.dispose]();
      }
    };
  }, [resource]);

  return [resource, setResource];
}