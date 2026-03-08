import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { KeyedCache } from "../lib/keyed_cache.js";

describe("KeyedCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("should store and retrieve values", () => {
    const cache = new KeyedCache<string, number>();
    cache.set("a", 1);
    cache.set("b", 2);

    expect(cache.get("a")).toBe(1);
    expect(cache.get("b")).toBe(2);
  });

  it("should return undefined for missing keys", () => {
    const cache = new KeyedCache<string, number>();
    expect(cache.get("missing")).toBeUndefined();
  });

  it("should expire entries after TTL", () => {
    const cache = new KeyedCache<string, number>({ defaultTTL: 1000 });
    cache.set("temp", 42);

    expect(cache.get("temp")).toBe(42);

    vi.advanceTimersByTime(1001);
    expect(cache.get("temp")).toBeUndefined();
  });

  it("should evict least recently used entries when max size is exceeded", () => {
    const cache = new KeyedCache<string, number>({ maxSize: 2 });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
  });

  it("should update existing keys and reset their position in LRU order", () => {
    const cache = new KeyedCache<string, number>({ maxSize: 2 });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.get("a"); // Access "a" to make it most recently used
    cache.set("c", 3); // This should evict "b"

    expect(cache.get("a")).toBe(1);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("c")).toBe(3);
  });

  it("should clear entries when clear is called", () => {
    const cache = new KeyedCache<string, number>();
    cache.set("a", 1);
    cache.set("b", 2);
    cache.clear("a");

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);

    cache.clear();
    expect(cache.get("b")).toBeUndefined();
  });
});
