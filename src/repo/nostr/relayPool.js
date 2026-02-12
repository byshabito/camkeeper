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

import { createRelayClient, normalizeRelayUrl, DEFAULT_RELAY_TIMEOUT_MS } from "./relayClient.js";

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

export async function publishEventToRelays({
  relays,
  event,
  timeoutMs = DEFAULT_RELAY_TIMEOUT_MS,
} = {}) {
  const relayUrls = normalizeRelayList(relays);
  const tasks = relayUrls.map(async (url) => {
    const client = createRelayClient({ url, timeoutMs });
    try {
      const result = await client.publish(event, { timeoutMs });
      return {
        url,
        ok: true,
        accepted: Boolean(result.accepted),
        message: result.message || "",
      };
    } catch (error) {
      return {
        url,
        ok: false,
        accepted: false,
        message: error?.message || "Relay publish failed.",
      };
    } finally {
      client.close();
    }
  });

  const results = await Promise.all(tasks);
  return {
    results,
    relayCount: results.length,
    successCount: results.filter((item) => item.ok).length,
    acceptedCount: results.filter((item) => item.accepted).length,
  };
}

export async function queryEventsFromRelays({
  relays,
  filters,
  timeoutMs = DEFAULT_RELAY_TIMEOUT_MS,
} = {}) {
  const relayUrls = normalizeRelayList(relays);
  const tasks = relayUrls.map(async (url) => {
    const client = createRelayClient({ url, timeoutMs });
    try {
      const result = await client.query({ filters, timeoutMs });
      return {
        url,
        ok: true,
        timedOut: Boolean(result.timedOut),
        closedReason: result.closedReason || "",
        events: Array.isArray(result.events) ? result.events : [],
      };
    } catch (error) {
      return {
        url,
        ok: false,
        timedOut: false,
        closedReason: "",
        events: [],
        error: error?.message || "Relay query failed.",
      };
    } finally {
      client.close();
    }
  });

  const relayResults = await Promise.all(tasks);
  const eventsById = new Map();

  relayResults.forEach((result) => {
    (result.events || []).forEach((event) => {
      if (!event || typeof event.id !== "string") return;
      const existing = eventsById.get(event.id);
      if (!existing) {
        eventsById.set(event.id, event);
        return;
      }
      const existingCreatedAt = Number.isFinite(existing.created_at) ? existing.created_at : 0;
      const nextCreatedAt = Number.isFinite(event.created_at) ? event.created_at : 0;
      if (nextCreatedAt >= existingCreatedAt) {
        eventsById.set(event.id, event);
      }
    });
  });

  return {
    events: Array.from(eventsById.values()),
    relays: relayResults,
  };
}
