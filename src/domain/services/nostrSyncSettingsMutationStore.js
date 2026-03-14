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

import { normalizeLivestreamSiteEntries } from "../sites.js";
import { normalizeSettings } from "../settings.js";
import {
  NOSTR_SYNC_SETTINGS_CHANGE_TRACKING_VERSION_STATE_KEY,
  NOSTR_SYNC_SETTINGS_LOCAL_MUTATIONS_STATE_KEY,
  NOSTR_SYNC_SETTINGS_SHADOW_STATE_KEY,
} from "../stateKeys.js";

export const NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES = "livestream_sites";
export const NOSTR_SYNC_SETTINGS_CHANGE_TRACKING_VERSION = 1;

function normalizeTimestamp(value, fallback = 0) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeScope(scope) {
  return isNonEmptyString(scope) ? scope.trim() : "";
}

function normalizeSites(entries) {
  return normalizeLivestreamSiteEntries(entries);
}

function areSameSites(left, right) {
  try {
    return JSON.stringify(normalizeSites(left)) === JSON.stringify(normalizeSites(right));
  } catch (error) {
    return false;
  }
}

export function normalizeSettingsMutationState(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const normalized = {};
  Object.entries(source).forEach(([scope, entry]) => {
    const normalizedScope = normalizeScope(scope);
    if (!normalizedScope) return;
    if (!entry || typeof entry !== "object") return;
    const timestamp = normalizeTimestamp(entry.timestamp, 0);
    if (!timestamp) return;
    normalized[normalizedScope] = { timestamp };
  });
  return normalized;
}

export function normalizeSettingsShadowState(raw) {
  return normalizeSettingsMutationState(raw);
}

export async function getLocalNostrSettingsMutations({ getStateFn }) {
  return normalizeSettingsMutationState(
    await getStateFn(NOSTR_SYNC_SETTINGS_LOCAL_MUTATIONS_STATE_KEY),
  );
}

export async function saveLocalNostrSettingsMutations(mutations, { setStateFn }) {
  const normalized = normalizeSettingsMutationState(mutations);
  await setStateFn(NOSTR_SYNC_SETTINGS_LOCAL_MUTATIONS_STATE_KEY, normalized);
  return normalized;
}

export async function getNostrSettingsShadow({ getStateFn }) {
  return normalizeSettingsShadowState(
    await getStateFn(NOSTR_SYNC_SETTINGS_SHADOW_STATE_KEY),
  );
}

export async function saveNostrSettingsShadow(shadow, { setStateFn }) {
  const normalized = normalizeSettingsShadowState(shadow);
  await setStateFn(NOSTR_SYNC_SETTINGS_SHADOW_STATE_KEY, normalized);
  return normalized;
}

export async function clearSettingsMutationScopes(scopes, { getStateFn, setStateFn }) {
  const next = await getLocalNostrSettingsMutations({ getStateFn });
  let changed = false;
  (Array.isArray(scopes) ? scopes : []).forEach((scope) => {
    const normalizedScope = normalizeScope(scope);
    if (!normalizedScope || !Object.hasOwn(next, normalizedScope)) return;
    delete next[normalizedScope];
    changed = true;
  });
  if (changed) {
    await saveLocalNostrSettingsMutations(next, { setStateFn });
  }
  return next;
}

export async function markLivestreamSitesChanged({
  previousSettings,
  nextSettings,
  getStateFn,
  setStateFn,
  now = Date.now,
}) {
  const previous = normalizeSettings(previousSettings);
  const next = normalizeSettings(nextSettings);
  if (areSameSites(previous.livestreamSites, next.livestreamSites)) {
    return getLocalNostrSettingsMutations({ getStateFn });
  }

  const mutations = await getLocalNostrSettingsMutations({ getStateFn });
  const timestamp = normalizeTimestamp(
    typeof now === "function" ? now() : now,
    Date.now(),
  );
  const existing = mutations[NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES];
  const nextTimestamp = Math.max(normalizeTimestamp(existing?.timestamp, 0), timestamp);
  mutations[NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES] = {
    timestamp: nextTimestamp,
  };
  await saveLocalNostrSettingsMutations(mutations, { setStateFn });
  return mutations;
}

export async function ensureNostrSettingsBootstrap({
  getSettingsFn,
  getStateFn,
  setStateFn,
  now = Date.now,
}) {
  const version = normalizeTimestamp(
    await getStateFn(NOSTR_SYNC_SETTINGS_CHANGE_TRACKING_VERSION_STATE_KEY),
    0,
  );
  const mutations = await getLocalNostrSettingsMutations({ getStateFn });
  if (version >= NOSTR_SYNC_SETTINGS_CHANGE_TRACKING_VERSION) {
    return mutations;
  }

  const settings = normalizeSettings(await getSettingsFn());
  const hasSites = normalizeSites(settings.livestreamSites).length > 0;
  if (hasSites) {
    const timestamp = normalizeTimestamp(
      typeof now === "function" ? now() : now,
      Date.now(),
    );
    const existing = mutations[NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES];
    const nextTimestamp = Math.max(normalizeTimestamp(existing?.timestamp, 0), timestamp);
    mutations[NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES] = {
      timestamp: nextTimestamp,
    };
    await saveLocalNostrSettingsMutations(mutations, { setStateFn });
  }

  await setStateFn(
    NOSTR_SYNC_SETTINGS_CHANGE_TRACKING_VERSION_STATE_KEY,
    NOSTR_SYNC_SETTINGS_CHANGE_TRACKING_VERSION,
  );
  return mutations;
}
