const SHARED_KEY = "__camkeeperChromeMock";

export function createChromeMock(initialLocal = {}, initialSync = {}) {
  const local = createStorageArea(initialLocal);
  const sync = createStorageArea(initialSync);
  return {
    storage: {
      local,
      sync,
    },
    runtime: {
      lastError: null,
    },
  };
}

export function getSharedChromeMock() {
  if (!globalThis[SHARED_KEY]) {
    globalThis[SHARED_KEY] = createChromeMock();
  }
  const mock = globalThis[SHARED_KEY];
  globalThis.chrome = mock;
  return mock;
}

function createStorageArea(initial) {
  const store = { ...initial };
  return {
    _store: store,
    get(keys, callback) {
      callback(resolveKeys(store, keys));
    },
    set(payload, callback) {
      Object.assign(store, payload || {});
      if (callback) callback();
    },
    clear() {
      Object.keys(store).forEach((key) => delete store[key]);
    },
  };
}

function resolveKeys(store, keys) {
  if (!keys) return { ...store };
  if (Array.isArray(keys)) {
    return keys.reduce((acc, key) => {
      if (Object.prototype.hasOwnProperty.call(store, key)) {
        acc[key] = store[key];
      }
      return acc;
    }, {});
  }
  if (typeof keys === "string") {
    return {
      [keys]: store[keys],
    };
  }
  if (typeof keys === "object") {
    return Object.keys(keys).reduce((acc, key) => {
      acc[key] = Object.prototype.hasOwnProperty.call(store, key) ? store[key] : keys[key];
      return acc;
    }, {});
  }
  return {};
}
