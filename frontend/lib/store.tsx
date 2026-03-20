import React, { useSyncExternalStore } from "react";

/**
 * A data store mimicking Flutter's ChangeNotifier.
 */
export class Store {
  private _listeners: Set<() => void> = new Set();
  private _version: number = 0;

  subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  notifyListeners(): void {
    this._version = (this._version + 1) % Number.MAX_SAFE_INTEGER;

    for (const listener of this._listeners) {
      listener();
    }
  }

  get version(): number {
    return this._version;
  }
}

export function createStoreContext<T extends Store>(type: new () => T) {
  const Context = React.createContext<T | null>(null);
  const OriginalProvider = Context.Provider;

  const Provider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
    const store = React.useRef(new type()).current;
    return <OriginalProvider value={store}>{children}</OriginalProvider>;
  };

  return Object.assign(Context, { Provider });
}

export function useReader<T extends Store>(Context: React.Context<T | null>): T {
  const store = React.useContext(Context);
  if (!store) {
    throw new Error("Store context is not provided");
  }
  return store;
}

export function useWatcher<T extends Store>(
  Context: React.Context<T | null>
): T {
  const store = useReader(Context);
  useSyncExternalStore(
    (onStoreChange) => store.subscribe(onStoreChange),
    () => store.version,
    () => store.version
  );
  return store;
}

export function useSelector<T extends Store, U>(
  Context: React.Context<T | null>,
  selector: (store: T) => U
): U {
  const store = useReader(Context);
  return useSyncExternalStore(
    (onStoreChange) => store.subscribe(onStoreChange),
    () => selector(store),
    () => selector(store)
  );
}