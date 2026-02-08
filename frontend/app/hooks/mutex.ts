import { useState, useRef, useCallback } from 'react';

import 'core-js/modules/es.symbol.dispose';
import 'core-js/modules/es.symbol.async-dispose';

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
      [Symbol.dispose]() {
        isLockedRef.current = false;
        setIsLocked(false);
      }
    };
  }, []);

  return { isLocked, tryLock };
}