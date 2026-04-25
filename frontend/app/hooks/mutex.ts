import SymbolHelper from '@ephemera/shared/lib/symbol_helper';
import { useCallback,useRef, useState } from 'react';

export function useMutex(initialState = false) {
  const [isLocked, setIsLocked] = useState(initialState);
  const isLockedRef = useRef(initialState);

  const tryLock = useCallback(() => {
    if (isLockedRef.current) {
      return null;
    }

    isLockedRef.current = true;
    setIsLocked(true);

    return {
      [SymbolHelper.dispose]() {
        isLockedRef.current = false;
        setIsLocked(false);
      }
    };
  }, []);

  return { isLocked, tryLock };
}