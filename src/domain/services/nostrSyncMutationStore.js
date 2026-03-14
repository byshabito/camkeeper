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

import {
  NOSTR_SYNC_CHANGE_TRACKING_VERSION_STATE_KEY,
  NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY,
  NOSTR_SYNC_PROFILE_SHADOW_STATE_KEY,
} from "../stateKeys.js";

export const NOSTR_LOCAL_MUTATION_STATE_UPSERT = "upsert";
export const NOSTR_LOCAL_MUTATION_STATE_DELETE = "delete";
export const NOSTR_SYNC_CHANGE_TRACKING_VERSION = 1;

function normalizeTimestamp(value, fallback = 0) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeShadowState(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const normalized = {};
  Object.entries(source).forEach(([id, entry]) => {
    if (!isNonEmptyString(id)) return;
    if (!entry || typeof entry !== "object") return;
    const state = entry.state === NOSTR_LOCAL_MUTATION_STATE_DELETE
      ? NOSTR_LOCAL_MUTATION_STATE_DELETE
      : NOSTR_LOCAL_MUTATION_STATE_UPSERT;
    const timestamp = normalizeTimestamp(entry.timestamp, 0);
    if (!timestamp) return;
    normalized[id] = { state, timestamp };
  });
  return normalized;
}

function profileToComparable(profile) {
  try {
    return JSON.stringify(profile || {});
  } catch (error) {
    return "";
  }
}

function toProfileMap(profiles) {
  return new Map(
    (Array.isArray(profiles) ? profiles : [])
      .filter((profile) => isNonEmptyString(profile?.id))
      .map((profile) => [profile.id, profile]),
  );
}

export function normalizeLocalMutationState(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const normalized = {};
  Object.entries(source).forEach(([id, entry]) => {
    if (!isNonEmptyString(id)) return;
    if (!entry || typeof entry !== "object") return;
    const state = entry.state === NOSTR_LOCAL_MUTATION_STATE_DELETE
      ? NOSTR_LOCAL_MUTATION_STATE_DELETE
      : entry.state === NOSTR_LOCAL_MUTATION_STATE_UPSERT
        ? NOSTR_LOCAL_MUTATION_STATE_UPSERT
        : "";
    const timestamp = normalizeTimestamp(entry.timestamp, 0);
    if (!state || !timestamp) return;
    normalized[id] = { state, timestamp };
  });
  return normalized;
}

export async function getLocalNostrProfileMutations({ getStateFn }) {
  return normalizeLocalMutationState(
    await getStateFn(NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY),
  );
}

export async function saveLocalNostrProfileMutations(mutations, { setStateFn }) {
  const normalized = normalizeLocalMutationState(mutations);
  await setStateFn(NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY, normalized);
  return normalized;
}

export async function clearLocalMutationEntries(profileIds, { getStateFn, setStateFn }) {
  const next = await getLocalNostrProfileMutations({ getStateFn });
  let changed = false;
  (Array.isArray(profileIds) ? profileIds : []).forEach((profileId) => {
    if (!isNonEmptyString(profileId)) return;
    if (!Object.hasOwn(next, profileId)) return;
    delete next[profileId];
    changed = true;
  });
  if (changed) {
    await saveLocalNostrProfileMutations(next, { setStateFn });
  }
  return next;
}

export async function ensureNostrChangeTrackingBootstrap({
  getProfilesFn,
  getStateFn,
  setStateFn,
  now = Date.now,
}) {
  const version = normalizeTimestamp(
    await getStateFn(NOSTR_SYNC_CHANGE_TRACKING_VERSION_STATE_KEY),
    0,
  );
  const mutations = await getLocalNostrProfileMutations({ getStateFn });
  if (version >= NOSTR_SYNC_CHANGE_TRACKING_VERSION) {
    return mutations;
  }

  const nowValue = normalizeTimestamp(
    typeof now === "function" ? now() : now,
    Date.now(),
  );
  const profilesResult = await getProfilesFn();
  const profiles = Array.isArray(profilesResult) ? profilesResult : [];
  let changed = false;

  profiles.forEach((profile) => {
    if (!isNonEmptyString(profile?.id)) return;
    const existing = mutations[profile.id];
    const nextTimestamp = Math.max(normalizeTimestamp(existing?.timestamp, 0), nowValue);
    if (
      !existing
      || existing.state !== NOSTR_LOCAL_MUTATION_STATE_UPSERT
      || existing.timestamp !== nextTimestamp
    ) {
      mutations[profile.id] = {
        state: NOSTR_LOCAL_MUTATION_STATE_UPSERT,
        timestamp: nextTimestamp,
      };
      changed = true;
    }
  });

  if (changed) {
    await saveLocalNostrProfileMutations(mutations, { setStateFn });
  }
  await setStateFn(
    NOSTR_SYNC_CHANGE_TRACKING_VERSION_STATE_KEY,
    NOSTR_SYNC_CHANGE_TRACKING_VERSION,
  );
  return mutations;
}

export async function trackLocalProfilePersistence({
  previousProfiles,
  nextProfiles,
  getStateFn,
  setStateFn,
  now = Date.now,
}) {
  const nowValue = normalizeTimestamp(
    typeof now === "function" ? now() : now,
    Date.now(),
  );
  const previousById = toProfileMap(previousProfiles);
  const nextById = toProfileMap(nextProfiles);
  const mutations = await getLocalNostrProfileMutations({ getStateFn });
  const shadowState = normalizeShadowState(
    await getStateFn(NOSTR_SYNC_PROFILE_SHADOW_STATE_KEY),
  );
  let changed = false;

  nextById.forEach((profile, profileId) => {
    const previous = previousById.get(profileId) || null;
    const profileChanged = !previous || profileToComparable(previous) !== profileToComparable(profile);
    if (!profileChanged) return;
    const existing = mutations[profileId];
    const nextTimestamp = Math.max(normalizeTimestamp(existing?.timestamp, 0), nowValue);
    if (
      !existing
      || existing.state !== NOSTR_LOCAL_MUTATION_STATE_UPSERT
      || existing.timestamp !== nextTimestamp
    ) {
      mutations[profileId] = {
        state: NOSTR_LOCAL_MUTATION_STATE_UPSERT,
        timestamp: nextTimestamp,
      };
      changed = true;
    }
  });

  previousById.forEach((profile, profileId) => {
    if (nextById.has(profileId)) return;
    const existing = mutations[profileId];
    const hasRemoteEvidence = Boolean(shadowState[profileId]);
    if (existing?.state === NOSTR_LOCAL_MUTATION_STATE_UPSERT && !hasRemoteEvidence) {
      delete mutations[profileId];
      changed = true;
      return;
    }
    const nextTimestamp = Math.max(normalizeTimestamp(existing?.timestamp, 0), nowValue);
    if (
      !existing
      || existing.state !== NOSTR_LOCAL_MUTATION_STATE_DELETE
      || existing.timestamp !== nextTimestamp
    ) {
      mutations[profileId] = {
        state: NOSTR_LOCAL_MUTATION_STATE_DELETE,
        timestamp: nextTimestamp,
      };
      changed = true;
    }
  });

  if (changed) {
    await saveLocalNostrProfileMutations(mutations, { setStateFn });
  }
  return mutations;
}
