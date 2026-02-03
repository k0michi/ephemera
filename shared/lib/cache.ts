type CacheEntry<T> = {
  value: T;
  expiry: number | null;
};

interface CacheOptions {
  defaultTTL?: number;
}

export class Cache<T> {
  private entry: CacheEntry<T> | null = null;
  private defaultTTL: number | null;

  constructor(options?: CacheOptions) {
    this.defaultTTL = options?.defaultTTL ?? null;
  }

  set(value: T, ttl?: number) {
    const expiryTTL = ttl ?? this.defaultTTL;
    const expiry = expiryTTL ? Date.now() + expiryTTL : null;
    this.entry = { value, expiry };
  }

  get(): T | undefined {
    if (!this.entry) {
      return undefined;
    }

    if (this.entry.expiry !== null && Date.now() > this.entry.expiry) {
      this.entry = null;
      return undefined;
    }

    return this.entry.value;
  }

  clear() {
    this.entry = null;
  }

  getOrSet(valueFn: () => T, ttl?: number): T;
  getOrSet(valueFn: () => Promise<T>, ttl?: number): Promise<T>;
  getOrSet(valueFn: () => T | Promise<T>, ttl?: number): T | Promise<T> {
    const cached = this.get();

    if (cached !== undefined) {
      return cached;
    }

    const value = valueFn();

    if (value instanceof Promise) {
      return value.then((resolvedValue) => {
        this.set(resolvedValue, ttl);
        return resolvedValue;
      });
    } else {
      this.set(value, ttl);
      return value;
    }
  }
}