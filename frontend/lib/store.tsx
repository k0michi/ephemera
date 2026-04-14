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

const StoreRegistryContext = React.createContext<Map<Function, Store>>(new Map());

export function StoreProvider<T extends Store>({
  create,
  children,
}: {
  create: () => T;
  children: React.ReactNode;
}) {
  const parentRegistry = React.useContext(StoreRegistryContext);
  const [store] = React.useState(create);

  const registry = React.useMemo(() => {
    const newRegistry = new Map(parentRegistry);
    newRegistry.set(store.constructor, store);
    return newRegistry;
  }, [parentRegistry, create, store]);

  return (
    <StoreRegistryContext.Provider value={registry}>
      {children}
    </StoreRegistryContext.Provider>
  );
}

export function useReader<T extends Store>(StoreClass: new (...args: any[]) => T): T {
  const registry = React.useContext(StoreRegistryContext);

  if (registry === null) {
    throw new Error("useReader must be used within a StoreContext");
  }

  const store = registry.get(StoreClass);

  if (store === undefined) {
    throw new Error(`No store found for ${StoreClass.name}`);
  }

  return store as T;
}

export function useWatcher<T extends Store>(StoreClass: new (...args: any[]) => T): T {
  const store = useReader(StoreClass);
  useSyncExternalStore(
    (onStoreChange) => store.subscribe(onStoreChange),
    () => store.version,
    () => store.version
  );
  return store;
}

export function useSelector<T extends Store, U>(
  StoreClass: new (...args: any[]) => T,
  selector: (store: T) => U
): U {
  const store = useReader(StoreClass);
  return useSyncExternalStore(
    (onStoreChange) => store.subscribe(onStoreChange),
    () => selector(store),
    () => selector(store)
  );
}