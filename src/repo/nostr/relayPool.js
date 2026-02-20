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

import { SimplePool } from "nostr-tools/pool";
import { DEFAULT_RELAY_TIMEOUT_MS, normalizeRelayUrl } from "./relayClient.js";

function normalizeRelayList(relays) {
  const list = Array.isArray(relays) ? relays : [];
  const unique = new Set();
  const normalized = [];
  list.forEach((relay) => {
    const value = typeof relay === "string" ? relay : relay?.url;
    const url = normalizeRelayUrl(value);
    if (!url || unique.has(url)) return;
    unique.add(url);
    normalized.push(url);
  });
  return normalized;
}

function normalizeFilter(filter) {
  if (!filter || typeof filter !== "object") return {};
  return { ...filter };
}

function normalizeFilterList(filters) {
  if (Array.isArray(filters)) {
    return filters.map((filter) => normalizeFilter(filter)).filter((filter) => Object.keys(filter).length > 0);
  }
  const normalized = normalizeFilter(filters);
  return Object.keys(normalized).length ? [normalized] : [];
}

function toErrorMessage(reason, fallback) {
  if (reason instanceof Error) {
    return reason.message || fallback;
  }
  if (typeof reason === "string" && reason) {
    return reason;
  }
  return fallback;
}

function shouldReplaceEvent(existing, next) {
  if (!existing) return true;
  const existingCreatedAt = Number.isFinite(existing.created_at) ? existing.created_at : 0;
  const nextCreatedAt = Number.isFinite(next.created_at) ? next.created_at : 0;
  return nextCreatedAt >= existingCreatedAt;
}

export async function publishEventToRelays({
  relays,
  event,
  timeoutMs = DEFAULT_RELAY_TIMEOUT_MS,
} = {}) {
  const relayUrls = normalizeRelayList(relays);
  if (!relayUrls.length) {
    return {
      results: [],
      relayCount: 0,
      successCount: 0,
      acceptedCount: 0,
    };
  }

  const pool = new SimplePool();
  try {
    const attempts = pool.publish(relayUrls, event, { maxWait: timeoutMs });
    const settled = await Promise.allSettled(attempts);
    const results = settled.map((item, index) => {
      const url = relayUrls[index] || "";
      if (item.status === "fulfilled") {
        const message = typeof item.value === "string" ? item.value : "";
        const accepted = !message.startsWith("connection failure:");
        return {
          url,
          ok: accepted,
          accepted,
          message,
        };
      }
      return {
        url,
        ok: false,
        accepted: false,
        message: toErrorMessage(item.reason, "Relay publish failed."),
      };
    });

    return {
      results,
      relayCount: results.length,
      successCount: results.filter((item) => item.ok).length,
      acceptedCount: results.filter((item) => item.accepted).length,
    };
  } finally {
    pool.close(relayUrls);
    pool.destroy();
  }
}

export async function queryEventsFromRelays({
  relays,
  filters,
  timeoutMs = DEFAULT_RELAY_TIMEOUT_MS,
} = {}) {
  const relayUrls = normalizeRelayList(relays);
  if (!relayUrls.length) {
    return {
      events: [],
      relays: [],
    };
  }

  const normalizedFilters = normalizeFilterList(filters);
  if (!normalizedFilters.length) {
    return {
      events: [],
      relays: relayUrls.map((url) => ({
        url,
        ok: true,
        timedOut: false,
        closedReason: "",
        events: [],
      })),
    };
  }

  const pool = new SimplePool();

  try {
    const relayResults = await Promise.all(relayUrls.map(async (url) => {
      const eventsById = new Map();
      try {
        for (const filter of normalizedFilters) {
          const events = await pool.querySync([url], filter, { maxWait: timeoutMs });
          (events || []).forEach((event) => {
            if (!event || typeof event.id !== "string") return;
            const existing = eventsById.get(event.id);
            if (shouldReplaceEvent(existing, event)) {
              eventsById.set(event.id, event);
            }
          });
        }
        return {
          url,
          ok: true,
          timedOut: false,
          closedReason: "",
          events: Array.from(eventsById.values()),
        };
      } catch (error) {
        return {
          url,
          ok: false,
          timedOut: false,
          closedReason: "",
          events: [],
          error: toErrorMessage(error, "Relay query failed."),
        };
      }
    }));

    const allEventsById = new Map();
    relayResults.forEach((result) => {
      (result.events || []).forEach((event) => {
        if (!event || typeof event.id !== "string") return;
        const existing = allEventsById.get(event.id);
        if (shouldReplaceEvent(existing, event)) {
          allEventsById.set(event.id, event);
        }
      });
    });

    return {
      events: Array.from(allEventsById.values()),
      relays: relayResults,
    };
  } finally {
    pool.close(relayUrls);
    pool.destroy();
  }
}
