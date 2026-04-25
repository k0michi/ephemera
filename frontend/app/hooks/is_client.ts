import { useSyncExternalStore } from 'react';

const subscribe = () => () => { };

export function useIsClient() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}