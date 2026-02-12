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

const MAX_NOSTR_RELAYS = 10;

export const NOSTR_SYNC_SIGNER_TYPE_LOCAL_NSEC = "local_nsec";

export const DEFAULT_NOSTR_RELAYS = Object.freeze([
  "wss://relay.damus.io",
  "wss://relay.primal.net",
  "wss://nos.lol",
]);

export const NOSTR_SYNC_DEFAULTS = Object.freeze({
  enabled: false,
  signerType: NOSTR_SYNC_SIGNER_TYPE_LOCAL_NSEC,
  relays: [...DEFAULT_NOSTR_RELAYS],
  relaysCustomized: false,
  autoPush: false,
});

export const NOSTR_SYNC_STATUS_DEFAULTS = Object.freeze({
  lastAttemptAt: null,
  lastSuccessAt: null,
  lastError: "",
  pushedCount: 0,
  pulledCount: 0,
});

function normalizeRelayUrl(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `wss://${trimmed}`;
  try {
    const url = new URL(candidate);
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

export function normalizeNostrRelays(rawRelays) {
  const source = Array.isArray(rawRelays) ? rawRelays : [];
  const unique = new Set();
  const relays = [];
  source.forEach((entry) => {
    const value = typeof entry === "string" ? entry : entry?.url;
    const normalized = normalizeRelayUrl(value);
    if (!normalized || unique.has(normalized)) return;
    unique.add(normalized);
    relays.push(normalized);
  });
  return relays.slice(0, MAX_NOSTR_RELAYS);
}

export function normalizeNostrSyncSettings(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const relaysCustomized = Object.hasOwn(source, "relaysCustomized")
    ? Boolean(source.relaysCustomized)
    : NOSTR_SYNC_DEFAULTS.relaysCustomized;
  const normalizedRelays = Object.hasOwn(source, "relays")
    ? normalizeNostrRelays(source.relays)
    : [...NOSTR_SYNC_DEFAULTS.relays];
  const relays = !relaysCustomized && normalizedRelays.length === 0
    ? [...NOSTR_SYNC_DEFAULTS.relays]
    : normalizedRelays;
  return {
    enabled: Object.hasOwn(source, "enabled") ? Boolean(source.enabled) : NOSTR_SYNC_DEFAULTS.enabled,
    signerType:
      source.signerType === NOSTR_SYNC_SIGNER_TYPE_LOCAL_NSEC
        ? source.signerType
        : NOSTR_SYNC_DEFAULTS.signerType,
    relays,
    relaysCustomized,
    autoPush: Object.hasOwn(source, "autoPush")
      ? Boolean(source.autoPush)
      : NOSTR_SYNC_DEFAULTS.autoPush,
  };
}

function normalizeCount(value) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  return Math.floor(value);
}

export function normalizeNostrSyncStatus(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    lastAttemptAt: Number.isFinite(source.lastAttemptAt) ? source.lastAttemptAt : null,
    lastSuccessAt: Number.isFinite(source.lastSuccessAt) ? source.lastSuccessAt : null,
    lastError: typeof source.lastError === "string" ? source.lastError : "",
    pushedCount: normalizeCount(source.pushedCount),
    pulledCount: normalizeCount(source.pulledCount),
  };
}

export function normalizeNostrSecret(value) {
  return typeof value === "string" ? value.trim() : "";
}
