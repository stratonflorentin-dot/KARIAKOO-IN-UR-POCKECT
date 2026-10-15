"use client";

// Tiny localStorage-backed external store for useSyncExternalStore. Used for
// per-device conveniences only (cart, delivery area, recently viewed), never
// for anything security-related.
export function createLocalStore<T>(key: string, fallback: T, parse: (raw: unknown) => T) {
  const listeners = new Set<() => void>();
  let cachedRaw: string | null | undefined;
  let cached: T = fallback;

  function read(): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return cachedRaw ?? null;
    }
  }

  function get(): T {
    const raw = read();
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      try {
        cached = raw ? parse(JSON.parse(raw)) : fallback;
      } catch {
        cached = fallback;
      }
    }
    return cached;
  }

  function set(value: T) {
    const raw = JSON.stringify(value);
    try {
      window.localStorage.setItem(key, raw);
    } catch {
      // Storage unavailable (private mode, quota): keep it in memory.
      cachedRaw = raw;
      cached = value;
    }
    listeners.forEach((l) => l());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  return { get, set, subscribe, getServer: () => fallback };
}
