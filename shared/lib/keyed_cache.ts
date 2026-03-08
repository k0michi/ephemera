import PromiseHelper from "./promise_helper.js";

type CacheEntry<T> = {
  value: T;
  expiry: number | null;
};

interface KeyedCacheOptions {
  defaultTTL?: number;
  maxSize?: number;
}

export class KeyedCache<K, V> {
  private entries: Map<K, CacheEntry<V>> = new Map();
  private pending: Map<K, Promise<V>> = new Map();

  private defaultTTL: number | null;
  private maxSize: number | null;

  constructor(options?: KeyedCacheOptions) {
    this.defaultTTL = options?.defaultTTL ?? null;
    this.maxSize = options?.maxSize ?? null;
  }

  set(key: K, value: V, ttl?: number) {
    const expiryTTL = ttl ?? this.defaultTTL;
    const expiry = expiryTTL ? Date.now() + expiryTTL : null;

    if (this.entries.has(key)) {
      this.entries.delete(key);
    }

    this.entries.set(key, { value, expiry });

    if (this.maxSize !== null && this.entries.size > this.maxSize) {
      const firstKey = this.entries.keys().next().value;

      if (firstKey !== undefined) {
        this.entries.delete(firstKey);
      }
    }
  }

  get(key: K): V | undefined {
    const entry = this.entries.get(key);

    if (!entry) {
      return undefined;
    }

    if (entry.expiry !== null && Date.now() > entry.expiry) {
      this.entries.delete(key);
      return undefined;
    }

    this.entries.delete(key);
    this.entries.set(key, entry);

    return entry.value;
  }

  clear(key?: K) {
    if (key !== undefined) {
      this.entries.delete(key);
      this.pending.delete(key);
    } else {
      this.entries.clear();
      this.pending.clear();
    }
  }

  getOrSet(key: K, valueFn: () => V, ttl?: number): V;
  getOrSet(key: K, valueFn: () => Promise<V>, ttl?: number): Promise<V>;
  getOrSet(key: K, valueFn: () => V | Promise<V>, ttl?: number): V | Promise<V> {
    const cached = this.get(key);

    if (cached !== undefined) {
      return cached;
    }

    if (this.pending.has(key)) {
      return this.pending.get(key)!;
    }

    let result = valueFn();

    result = PromiseHelper.tap(result, (resolvedValue) => {
      this.set(key, resolvedValue, ttl);
    });

    if (PromiseHelper.isPromise(result)) {
      result = result.finally(() => {
        this.pending.delete(key);
      });

      this.pending.set(key, result);
    }

    return result;
  }
}