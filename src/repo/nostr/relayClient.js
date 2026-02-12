/*
 * CamKeeper - Cross-site creator profile manager
 * Copyright (C) 2026  Shabito
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

export const DEFAULT_RELAY_TIMEOUT_MS = 12000;

function createSubscriptionId(prefix = "camkeeper") {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function parseMessage(data) {
  if (typeof data !== "string") return null;
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    return null;
  }
}

function normalizeFilter(filter) {
  if (!filter || typeof filter !== "object") return {};
  return { ...filter };
}

export function normalizeRelayUrl(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `wss://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "wss:") return "";
    if (!url.hostname) return "";
    url.username = "";
    url.password = "";
    url.hash = "";
    url.search = "";
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname === "/") {
      url.pathname = "";
    } else {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }
    return url.toString();
  } catch (error) {
    return "";
  }
}

export function createRelayClient({ url, timeoutMs = DEFAULT_RELAY_TIMEOUT_MS } = {}) {
  const relayUrl = normalizeRelayUrl(url);
  if (!relayUrl) {
    throw new Error("Relay URL must be a valid wss:// URL.");
  }

  let socket = null;
  let connectPromise = null;
  const listeners = new Set();

  function dispatch(message) {
    listeners.forEach((listener) => {
      try {
        listener(message);
      } catch (error) {
        // Ignore listener failures to keep socket event loop alive.
      }
    });
  }

  function addListener(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function send(payload) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error("Relay socket is not open.");
    }
    socket.send(JSON.stringify(payload));
  }

  async function connect() {
    if (socket && socket.readyState === WebSocket.OPEN) return socket;
    if (connectPromise) return connectPromise;

    connectPromise = new Promise((resolve, reject) => {
      let settled = false;
      const ws = new WebSocket(relayUrl);

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        try {
          ws.close();
        } catch (error) {
          // Ignore close errors.
        }
        connectPromise = null;
        reject(new Error(`Relay connect timed out for ${relayUrl}`));
      }, timeoutMs);

      ws.addEventListener("open", () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        socket = ws;
        connectPromise = null;
        resolve(ws);
      });

      ws.addEventListener("message", (event) => {
        const message = parseMessage(event.data);
        if (!message) return;
        dispatch(message);
      });

      ws.addEventListener("error", () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        connectPromise = null;
        reject(new Error(`Relay connection error for ${relayUrl}`));
      });

      ws.addEventListener("close", () => {
        if (socket === ws) {
          socket = null;
        }
      });
    });

    return connectPromise;
  }

  function close() {
    if (!socket) return;
    try {
      socket.close();
    } catch (error) {
      // Ignore close errors.
    }
    socket = null;
  }

  async function publish(event, { timeoutMs: publishTimeoutMs = timeoutMs } = {}) {
    if (!event?.id || typeof event.id !== "string") {
      throw new Error("Cannot publish event without an event id.");
    }
    await connect();

    return new Promise((resolve, reject) => {
      let done = false;
      const clear = addListener((message) => {
        if (done) return;
        if (message[0] !== "OK") return;
        if (message[1] !== event.id) return;
        done = true;
        clearTimeout(timer);
        clear();
        resolve({
          accepted: Boolean(message[2]),
          message: typeof message[3] === "string" ? message[3] : "",
        });
      });

      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        clear();
        reject(new Error(`Relay publish timed out for ${relayUrl}`));
      }, publishTimeoutMs);

      try {
        send(["EVENT", event]);
      } catch (error) {
        done = true;
        clearTimeout(timer);
        clear();
        reject(error);
      }
    });
  }

  async function query({
    filters = [],
    subscriptionId = createSubscriptionId(),
    timeoutMs: queryTimeoutMs = timeoutMs,
  } = {}) {
    await connect();

    const normalizedFilters = Array.isArray(filters)
      ? filters.map((filter) => normalizeFilter(filter))
      : [normalizeFilter(filters)];

    return new Promise((resolve, reject) => {
      let done = false;
      const eventsById = new Map();
      let closedReason = "";

      const finish = ({ timedOut = false, error = null } = {}) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        removeListener();
        try {
          send(["CLOSE", subscriptionId]);
        } catch (sendError) {
          // Ignore close-subscription failures.
        }
        if (error) {
          reject(error);
          return;
        }
        resolve({
          events: Array.from(eventsById.values()),
          timedOut,
          closedReason,
        });
      };

      const removeListener = addListener((message) => {
        if (done) return;
        const type = message[0];
        if (type === "EVENT" && message[1] === subscriptionId) {
          const event = message[2];
          if (event && typeof event === "object" && typeof event.id === "string") {
            eventsById.set(event.id, event);
          }
          return;
        }
        if (type === "EOSE" && message[1] === subscriptionId) {
          finish();
          return;
        }
        if (type === "CLOSED" && message[1] === subscriptionId) {
          closedReason = typeof message[2] === "string" ? message[2] : "";
          finish();
        }
      });

      const timer = setTimeout(() => {
        finish({ timedOut: true });
      }, queryTimeoutMs);

      try {
        send(["REQ", subscriptionId, ...normalizedFilters]);
      } catch (error) {
        finish({ error });
      }
    });
  }

  return {
    url: relayUrl,
    connect,
    close,
    publish,
    query,
  };
}
