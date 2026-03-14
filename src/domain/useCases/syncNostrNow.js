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

import { mergeProfiles } from "../profiles.js";
import { normalizeProfileForStorage } from "../migrations/profiles.js";
import { normalizeSettings } from "../settings.js";
import { normalizeLivestreamSiteEntries } from "../sites.js";
import {
  NOSTR_SYNC_PROFILE_SHADOW_STATE_KEY,
  NOSTR_SYNC_PROFILE_TOMBSTONES_STATE_KEY,
} from "../stateKeys.js";
import { getProfiles, saveProfiles } from "../services/profilesStore.js";
import { getSettings, saveSettings } from "../services/settingsStore.js";
import { getState, setState } from "../services/stateStore.js";
import {
  ensureNostrChangeTrackingBootstrap,
  getLocalNostrProfileMutations,
  NOSTR_LOCAL_MUTATION_STATE_DELETE,
  NOSTR_LOCAL_MUTATION_STATE_UPSERT,
  saveLocalNostrProfileMutations,
} from "../services/nostrSyncMutationStore.js";
import {
  ensureNostrSettingsBootstrap,
  getLocalNostrSettingsMutations,
  getNostrSettingsShadow,
  NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES,
  saveLocalNostrSettingsMutations,
  saveNostrSettingsShadow,
} from "../services/nostrSyncSettingsMutationStore.js";
import {
  getNostrSyncConfig,
  getNostrSyncStatus,
  resolveNostrSyncSecretForSync,
  setNostrSyncStatus,
} from "./nostrSyncSettings.js";
import {
  NIP78_EVENT_KIND,
  buildProfileDeleteEventTemplate,
  buildProfileUpsertEventTemplate,
  buildSettingsUpsertEventTemplate,
  createSignedEvent,
  decodeProfileEventContent,
  decodeSettingsEventContent,
  getPublicKeyHexFromPrivateKeyHex,
  normalizePrivateKeyHex,
  privateKeyHexFromNsec,
  publishEventToRelays,
  queryEventsFromRelays,
  verifySignedEvent,
} from "../../repo/nostr/index.js";

const MAX_SYNC_TOMBSTONES = 5000;
const MAX_SYNC_SHADOW = 5000;
const MAX_PULL_EVENTS = 2500;
const MAX_EVENT_CONTENT_CHARS = 65536;
const MAX_EVENT_DECODE_FAILURES = 500;

const NOSTR_SYNC_ACTION_UPSERT = "upsert";
const NOSTR_SYNC_ACTION_DELETE = "delete";
const NOSTR_SYNC_ENTITY_PROFILE = "profile";
const NOSTR_SYNC_ENTITY_SETTINGS = "settings";

const NOSTR_SYNC_MODE_FULL = "full";
const NOSTR_SYNC_MODE_PULL = "pull";
const NOSTR_SYNC_MODE_PUSH = "push";

const SHADOW_STATE_UPSERT = NOSTR_SYNC_ACTION_UPSERT;
const SHADOW_STATE_DELETE = NOSTR_SYNC_ACTION_DELETE;

function getNowMs(nowFn) {
  const value = typeof nowFn === "function" ? nowFn() : Date.now();
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : Date.now();
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeTimestamp(value, fallback = 0) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

function normalizeShadowState(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const normalized = {};
  Object.entries(source).forEach(([id, entry]) => {
    if (!isNonEmptyString(id)) return;
    if (!entry || typeof entry !== "object") return;
    const state = entry.state === SHADOW_STATE_DELETE ? SHADOW_STATE_DELETE : SHADOW_STATE_UPSERT;
    const timestamp = normalizeTimestamp(entry.timestamp, 0);
    if (!timestamp) return;
    normalized[id] = { state, timestamp };
  });
  return normalized;
}

function normalizeTombstonesState(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const normalized = {};
  Object.entries(source).forEach(([id, value]) => {
    if (!isNonEmptyString(id)) return;
    const timestamp = normalizeTimestamp(value, 0);
    if (!timestamp) return;
    normalized[id] = timestamp;
  });
  return normalized;
}

function pruneMapByTimestamp(mapObject, maxEntries) {
  const entries = Object.entries(mapObject || {})
    .filter(([id]) => isNonEmptyString(id))
    .sort((left, right) => {
      const leftValue = left[1] && typeof left[1] === "object" ? left[1].timestamp : left[1];
      const rightValue = right[1] && typeof right[1] === "object" ? right[1].timestamp : right[1];
      return normalizeTimestamp(rightValue, 0) - normalizeTimestamp(leftValue, 0);
    })
    .slice(0, maxEntries);
  return Object.fromEntries(entries);
}

function profileToComparable(profile) {
  return JSON.stringify(profile || {});
}

function resolvePrivateKeyHex(secret) {
  const value = typeof secret === "string" ? secret.trim() : "";
  if (!value) {
    throw new Error("No local Nostr private key is configured.");
  }
  try {
    const normalizedValue = value.toLowerCase();
    if (normalizedValue.startsWith("nsec1")) {
      return privateKeyHexFromNsec(normalizedValue);
    }
    return normalizePrivateKeyHex(value);
  } catch (error) {
    throw new Error("Stored Nostr key is invalid.");
  }
}

function getRemoteOperationTimestamp(operation) {
  if (!operation || typeof operation !== "object") return 0;
  if (operation.action === NOSTR_SYNC_ACTION_DELETE) {
    return normalizeTimestamp(operation.deletedAt, operation.eventCreatedAt);
  }
  return normalizeTimestamp(operation.updatedAt, operation.eventCreatedAt);
}

function shouldReplaceRemoteOperation(current, candidate) {
  if (!current) return true;
  const currentTs = getRemoteOperationTimestamp(current);
  const candidateTs = getRemoteOperationTimestamp(candidate);
  if (candidateTs !== currentTs) return candidateTs > currentTs;
  const currentCreatedAt = normalizeTimestamp(current.eventCreatedAt, 0);
  const candidateCreatedAt = normalizeTimestamp(candidate.eventCreatedAt, 0);
  if (candidateCreatedAt !== currentCreatedAt) return candidateCreatedAt > currentCreatedAt;
  const currentId = typeof current.eventId === "string" ? current.eventId : "";
  const candidateId = typeof candidate.eventId === "string" ? candidate.eventId : "";
  return candidateId > currentId;
}

async function setStatus({
  nowMs,
  setNostrSyncStatusFn,
  previousStatus,
  pushedCount,
  pulledCount,
  lastError,
  success,
}) {
  const status = {
    ...previousStatus,
    lastAttemptAt: nowMs,
    lastSuccessAt: success ? nowMs : previousStatus.lastSuccessAt,
    pushedCount: Number.isFinite(pushedCount) ? Math.max(0, Math.floor(pushedCount)) : 0,
    pulledCount: Number.isFinite(pulledCount) ? Math.max(0, Math.floor(pulledCount)) : 0,
    lastError: typeof lastError === "string" ? lastError : "",
  };
  await setNostrSyncStatusFn(status);
  return status;
}

function buildFailureResult({ code, message, status }) {
  return {
    ok: false,
    code,
    error: message,
    status,
    pushedCount: status?.pushedCount || 0,
    pulledCount: status?.pulledCount || 0,
    pushedSettingsScopes: [],
    pulledSettingsScopes: [],
  };
}

function buildSuccessResult({
  status,
  publishFailures,
  pushedSettingsScopes = [],
  pulledSettingsScopes = [],
}) {
  return {
    ok: publishFailures.length === 0,
    code: publishFailures.length === 0 ? "ok" : "partial_failure",
    error: publishFailures.length === 0 ? "" : `${publishFailures.length} event(s) failed to publish.`,
    status,
    pushedCount: status.pushedCount,
    pulledCount: status.pulledCount,
    publishFailures,
    pushedSettingsScopes,
    pulledSettingsScopes,
  };
}

function normalizeTimeoutMs(timeoutMs) {
  if (!Number.isFinite(timeoutMs)) return undefined;
  const normalized = Math.floor(timeoutMs);
  if (normalized <= 0) return undefined;
  return normalized;
}

function normalizeSyncMode(mode) {
  if (mode === NOSTR_SYNC_MODE_PULL || mode === NOSTR_SYNC_MODE_PUSH) {
    return mode;
  }
  return NOSTR_SYNC_MODE_FULL;
}

export async function syncNostrNow({
  now = Date.now,
  mode = NOSTR_SYNC_MODE_FULL,
  timeoutMs,
  queryEventsFn = queryEventsFromRelays,
  publishEventFn = publishEventToRelays,
  verifySignedEventFn = verifySignedEvent,
  decodeProfileEventContentFn = decodeProfileEventContent,
  buildProfileUpsertEventTemplateFn = buildProfileUpsertEventTemplate,
  buildProfileDeleteEventTemplateFn = buildProfileDeleteEventTemplate,
  buildSettingsUpsertEventTemplateFn = buildSettingsUpsertEventTemplate,
  createSignedEventFn = createSignedEvent,
  getPublicKeyHexFn = getPublicKeyHexFromPrivateKeyHex,
  getProfilesFn = getProfiles,
  saveProfilesFn = saveProfiles,
  getSettingsFn = getSettings,
  saveSettingsFn = saveSettings,
  getStateFn = getState,
  setStateFn = setState,
  getNostrSyncConfigFn = getNostrSyncConfig,
  resolveNostrSyncSecretForSyncFn = resolveNostrSyncSecretForSync,
  getNostrSyncStatusFn = getNostrSyncStatus,
  setNostrSyncStatusFn = setNostrSyncStatus,
  decodeSettingsEventContentFn = decodeSettingsEventContent,
} = {}) {
  const attemptAt = getNowMs(now);
  const syncMode = normalizeSyncMode(mode);
  const previousStatus = await getNostrSyncStatusFn();

  const config = await getNostrSyncConfigFn();
  if (!config?.enabled) {
    const status = await setStatus({
      nowMs: attemptAt,
      setNostrSyncStatusFn,
      previousStatus,
      pushedCount: 0,
      pulledCount: 0,
      lastError: "Nostr sync is disabled.",
      success: false,
    });
    return buildFailureResult({ code: "disabled", message: status.lastError, status });
  }

  const relays = Array.isArray(config.relays) ? config.relays.filter((relay) => isNonEmptyString(relay)) : [];
  if (!relays.length) {
    const status = await setStatus({
      nowMs: attemptAt,
      setNostrSyncStatusFn,
      previousStatus,
      pushedCount: 0,
      pulledCount: 0,
      lastError: "No relay configured for Nostr sync.",
      success: false,
    });
    return buildFailureResult({ code: "missing_relays", message: status.lastError, status });
  }

  let privateKeyHex;
  try {
    const secret = await resolveNostrSyncSecretForSyncFn();
    privateKeyHex = resolvePrivateKeyHex(secret);
  } catch (error) {
    const status = await setStatus({
      nowMs: attemptAt,
      setNostrSyncStatusFn,
      previousStatus,
      pushedCount: 0,
      pulledCount: 0,
      lastError: error?.message || "Unable to read Nostr key.",
      success: false,
    });
    return buildFailureResult({ code: "invalid_secret", message: status.lastError, status });
  }

  const normalizedTimeoutMs = normalizeTimeoutMs(timeoutMs);
  const localProfiles = await getProfilesFn();
  let localSettings = normalizeSettings(await getSettingsFn());
  const localById = new Map(
    (Array.isArray(localProfiles) ? localProfiles : [])
      .filter((profile) => isNonEmptyString(profile?.id))
      .map((profile) => [profile.id, profile]),
  );
  let localMutationsState = await ensureNostrChangeTrackingBootstrap({
    getProfilesFn: async () => Array.from(localById.values()),
    getStateFn,
    setStateFn,
    now: () => attemptAt,
  });
  if (!localMutationsState || typeof localMutationsState !== "object") {
    localMutationsState = await getLocalNostrProfileMutations({ getStateFn });
  }
  let settingsLocalMutations = await ensureNostrSettingsBootstrap({
    getSettingsFn,
    getStateFn,
    setStateFn,
    now: () => attemptAt,
  });
  if (!settingsLocalMutations || typeof settingsLocalMutations !== "object") {
    settingsLocalMutations = await getLocalNostrSettingsMutations({ getStateFn });
  }

  const shadowState = normalizeShadowState(
    await getStateFn(NOSTR_SYNC_PROFILE_SHADOW_STATE_KEY),
  );
  const tombstonesState = normalizeTombstonesState(
    await getStateFn(NOSTR_SYNC_PROFILE_TOMBSTONES_STATE_KEY),
  );
  const settingsShadowState = await getNostrSettingsShadow({ getStateFn });

  let tombstonesChanged = false;
  let pulledCount = 0;
  const pullWarnings = [];
  const pulledSettingsScopes = [];
  const pushedSettingsScopes = [];

  if (syncMode !== NOSTR_SYNC_MODE_PUSH) {
    const remoteByProfileId = new Map();
    const remoteBySettingsScope = new Map();
    try {
      const pubkey = getPublicKeyHexFn(privateKeyHex);
      const { events } = await queryEventsFn({
        relays,
        filters: [{ kinds: [NIP78_EVENT_KIND], authors: [pubkey], limit: 5000 }],
        timeoutMs: normalizedTimeoutMs,
      });

      const allEvents = Array.isArray(events) ? events : [];
      if (allEvents.length > MAX_PULL_EVENTS) {
        pullWarnings.push(`Ignored ${allEvents.length - MAX_PULL_EVENTS} remote events over processing limit.`);
      }

      let decodeFailures = 0;

      for (const event of allEvents.slice(0, MAX_PULL_EVENTS)) {
        if (!(await verifySignedEventFn(event))) continue;
        const eventContent = typeof event?.content === "string" ? event.content : "";
        if (eventContent.length > MAX_EVENT_CONTENT_CHARS) {
          continue;
        }
        let envelope;
        try {
          envelope = await decodeProfileEventContentFn(privateKeyHex, event);
        } catch (error) {
          try {
            envelope = await decodeSettingsEventContentFn(privateKeyHex, event);
          } catch (settingsError) {
            decodeFailures += 1;
            if (decodeFailures >= MAX_EVENT_DECODE_FAILURES) {
              pullWarnings.push("Stopped decoding remote events after repeated decode failures.");
              break;
            }
            continue;
          }
        }
        if (envelope.entity === NOSTR_SYNC_ENTITY_PROFILE) {
          const profileId = isNonEmptyString(envelope.profileId) ? envelope.profileId : "";
          if (!profileId) continue;
          const candidate = {
            action: envelope.action,
            profileId,
            profile: envelope.payload,
            updatedAt: normalizeTimestamp(envelope.updatedAt, 0),
            deletedAt: normalizeTimestamp(envelope.deletedAt, 0),
            eventId: typeof event.id === "string" ? event.id : "",
            eventCreatedAt: normalizeTimestamp(event.created_at, 0) * 1000,
          };
          if (
            candidate.action !== NOSTR_SYNC_ACTION_UPSERT
            && candidate.action !== NOSTR_SYNC_ACTION_DELETE
          ) {
            continue;
          }
          const current = remoteByProfileId.get(profileId) || null;
          if (shouldReplaceRemoteOperation(current, candidate)) {
            remoteByProfileId.set(profileId, candidate);
          }
          continue;
        }

        if (envelope.entity === NOSTR_SYNC_ENTITY_SETTINGS) {
          const scope = isNonEmptyString(envelope.scope) ? envelope.scope.trim() : "";
          if (!scope) continue;
          const candidate = {
            action: envelope.action,
            scope,
            payload: envelope.payload,
            updatedAt: normalizeTimestamp(envelope.updatedAt, 0),
            eventId: typeof event.id === "string" ? event.id : "",
            eventCreatedAt: normalizeTimestamp(event.created_at, 0) * 1000,
          };
          if (candidate.action !== NOSTR_SYNC_ACTION_UPSERT) {
            continue;
          }
          const current = remoteBySettingsScope.get(scope) || null;
          if (shouldReplaceRemoteOperation(current, candidate)) {
            remoteBySettingsScope.set(scope, candidate);
          }
        }
      }
    } catch (error) {
      const status = await setStatus({
        nowMs: attemptAt,
        setNostrSyncStatusFn,
        previousStatus,
        pushedCount: 0,
        pulledCount: 0,
        lastError: "Failed to query Nostr relays.",
        success: false,
      });
      return buildFailureResult({ code: "pull_failed", message: status.lastError, status });
    }

    let localProfilesChanged = false;

    for (const remote of remoteByProfileId.values()) {
      const profileId = remote.profileId;
      const localProfile = localById.get(profileId) || null;
      const localUpdatedAt = normalizeTimestamp(localProfile?.updatedAt, 0);
      const localDeletedAt = normalizeTimestamp(tombstonesState[profileId], 0);
      const localPendingMutation = localMutationsState[profileId] || null;
      const localPendingTimestamp = normalizeTimestamp(localPendingMutation?.timestamp, 0);
      const localEffectiveUpsertTs = localPendingMutation?.state === NOSTR_LOCAL_MUTATION_STATE_UPSERT
        ? Math.max(localUpdatedAt, localPendingTimestamp)
        : localUpdatedAt;
      const localEffectiveDeleteTs = localPendingMutation?.state === NOSTR_LOCAL_MUTATION_STATE_DELETE
        ? Math.max(localDeletedAt, localPendingTimestamp)
        : localDeletedAt;
      const remoteTimestamp = getRemoteOperationTimestamp(remote);

      if (remote.action === NOSTR_SYNC_ACTION_DELETE) {
        if (remoteTimestamp >= Math.max(localEffectiveUpsertTs, localEffectiveDeleteTs)) {
          if (localProfile) {
            localById.delete(profileId);
            localProfilesChanged = true;
          }
          if (tombstonesState[profileId] !== remoteTimestamp) {
            tombstonesState[profileId] = remoteTimestamp;
            tombstonesChanged = true;
          }
          if (Object.hasOwn(localMutationsState, profileId)) {
            delete localMutationsState[profileId];
          }
          pulledCount += 1;
        }
        continue;
      }

      if (remoteTimestamp <= localEffectiveDeleteTs) {
        continue;
      }

      const remoteProfile = normalizeProfileForStorage({
        ...(remote.profile || {}),
        id: profileId,
        updatedAt: remoteTimestamp,
        createdAt: normalizeTimestamp(remote.profile?.createdAt, remoteTimestamp),
      });

      if (!localProfile) {
        localById.set(profileId, remoteProfile);
        localProfilesChanged = true;
        pulledCount += 1;
        if (Object.hasOwn(localMutationsState, profileId)) {
          delete localMutationsState[profileId];
        }
        if (Object.hasOwn(tombstonesState, profileId)) {
          delete tombstonesState[profileId];
          tombstonesChanged = true;
        }
        continue;
      }

      if (remoteTimestamp > localEffectiveUpsertTs) {
        const merged = mergeProfiles(localProfile, remoteProfile);
        const normalizedMerged = normalizeProfileForStorage({
          ...merged,
          id: profileId,
          updatedAt: remoteTimestamp,
          createdAt: normalizeTimestamp(localProfile.createdAt, remoteProfile.createdAt || remoteTimestamp),
        });
        if (profileToComparable(normalizedMerged) !== profileToComparable(localProfile)) {
          localById.set(profileId, normalizedMerged);
          localProfilesChanged = true;
          pulledCount += 1;
        }
        if (Object.hasOwn(localMutationsState, profileId)) {
          delete localMutationsState[profileId];
        }
        if (Object.hasOwn(tombstonesState, profileId)) {
          delete tombstonesState[profileId];
          tombstonesChanged = true;
        }
        continue;
      }

      if (remoteTimestamp === localEffectiveUpsertTs) {
        const merged = mergeProfiles(localProfile, remoteProfile);
        const normalizedMerged = normalizeProfileForStorage({
          ...merged,
          id: profileId,
          updatedAt: localUpdatedAt,
          createdAt: normalizeTimestamp(localProfile.createdAt, remoteProfile.createdAt || localUpdatedAt),
        });
        if (profileToComparable(normalizedMerged) !== profileToComparable(localProfile)) {
          localById.set(profileId, normalizedMerged);
          localProfilesChanged = true;
          pulledCount += 1;
        }
        if (Object.hasOwn(tombstonesState, profileId)) {
          delete tombstonesState[profileId];
          tombstonesChanged = true;
        }
      }
    }

    if (localProfilesChanged) {
      await saveProfilesFn(Array.from(localById.values()), { syncOrigin: "remote" });
    }

    for (const remote of remoteBySettingsScope.values()) {
      if (remote.scope !== NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES) continue;
      const localSettingsMutationTs = normalizeTimestamp(
        settingsLocalMutations[NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES]?.timestamp,
        0,
      );
      const settingsShadowTs = normalizeTimestamp(
        settingsShadowState[NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES]?.timestamp,
        0,
      );
      const localEffectiveSettingsTs = Math.max(localSettingsMutationTs, settingsShadowTs);
      const remoteUpdatedAt = normalizeTimestamp(remote.updatedAt, 0);
      if (remoteUpdatedAt <= localEffectiveSettingsTs) {
        continue;
      }

      const normalizedRemoteSites = normalizeLivestreamSiteEntries(remote.payload);
      const nextSettings = normalizeSettings({
        ...localSettings,
        livestreamSites: normalizedRemoteSites,
      });
      const currentSites = normalizeLivestreamSiteEntries(localSettings.livestreamSites);
      const changed = JSON.stringify(currentSites) !== JSON.stringify(normalizedRemoteSites);
      if (changed) {
        localSettings = await saveSettingsFn(nextSettings, { syncOrigin: "remote" });
      } else {
        localSettings = nextSettings;
      }
      delete settingsLocalMutations[NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES];
      settingsShadowState[NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES] = {
        timestamp: remoteUpdatedAt,
      };
      pulledCount += 1;
      if (!pulledSettingsScopes.includes(NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES)) {
        pulledSettingsScopes.push(NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES);
      }
    }
  }

  const localIds = new Set(localById.keys());
  Object.keys(tombstonesState).forEach((profileId) => {
    if (localIds.has(profileId)) {
      delete tombstonesState[profileId];
      tombstonesChanged = true;
    }
  });

  Object.entries(localMutationsState).forEach(([profileId, mutation]) => {
    if (mutation?.state === NOSTR_LOCAL_MUTATION_STATE_UPSERT && !localIds.has(profileId)) {
      delete localMutationsState[profileId];
    }
    if (mutation?.state === NOSTR_LOCAL_MUTATION_STATE_DELETE && localIds.has(profileId)) {
      delete localMutationsState[profileId];
    }
  });

  Object.keys(settingsLocalMutations).forEach((scope) => {
    if (scope !== NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES) {
      delete settingsLocalMutations[scope];
    }
  });

  const upsertQueue = [];
  Object.entries(localMutationsState).forEach(([profileId, mutation]) => {
    if (mutation?.state !== NOSTR_LOCAL_MUTATION_STATE_UPSERT) return;
    const profile = localById.get(profileId) || null;
    if (!profile) return;
    const updatedAt = normalizeTimestamp(mutation.timestamp, attemptAt);
    const shadow = shadowState[profileId];
    if (!shadow || shadow.state !== SHADOW_STATE_UPSERT || updatedAt > shadow.timestamp) {
      upsertQueue.push({ profileId, profile, updatedAt });
    }
  });

  const deleteQueue = Object.entries(localMutationsState)
    .filter(([, mutation]) => mutation?.state === NOSTR_LOCAL_MUTATION_STATE_DELETE)
    .map(([profileId, mutation]) => ({
      profileId,
      deletedAt: normalizeTimestamp(mutation.timestamp, attemptAt),
    }))
    .filter(({ profileId, deletedAt }) => {
      if (localById.has(profileId)) return false;
      const shadow = shadowState[profileId];
      if (!shadow) return true;
      if (shadow.state !== SHADOW_STATE_DELETE) return true;
      return deletedAt > shadow.timestamp;
    });
  const settingsUpsertQueue = [];
  const settingsMutation = settingsLocalMutations[NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES];
  const settingsMutationTimestamp = normalizeTimestamp(settingsMutation?.timestamp, 0);
  if (settingsMutationTimestamp) {
    const shadowTimestamp = normalizeTimestamp(
      settingsShadowState[NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES]?.timestamp,
      0,
    );
    if (!shadowTimestamp || settingsMutationTimestamp > shadowTimestamp) {
      settingsUpsertQueue.push({
        scope: NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES,
        payload: normalizeLivestreamSiteEntries(localSettings.livestreamSites),
        updatedAt: settingsMutationTimestamp,
      });
    }
  }

  let pushedCount = 0;
  const publishFailures = [];

  if (syncMode !== NOSTR_SYNC_MODE_PULL) {
    for (const item of upsertQueue) {
      try {
        const template = await buildProfileUpsertEventTemplateFn(privateKeyHex, item.profile, {
          updatedAt: item.updatedAt,
        });
        const signedEvent = await createSignedEventFn({
          ...template,
          privateKeyHex,
          createdAt: Math.floor(item.updatedAt / 1000),
        });
        const publishResult = await publishEventFn({
          relays,
          event: signedEvent,
          timeoutMs: normalizedTimeoutMs,
        });
        if (publishResult.acceptedCount > 0) {
          shadowState[item.profileId] = {
            state: SHADOW_STATE_UPSERT,
            timestamp: item.updatedAt,
          };
          if (Object.hasOwn(localMutationsState, item.profileId)) {
            delete localMutationsState[item.profileId];
          }
          pushedCount += 1;
          if (Object.hasOwn(tombstonesState, item.profileId)) {
            delete tombstonesState[item.profileId];
            tombstonesChanged = true;
          }
        } else {
          publishFailures.push({
            type: SHADOW_STATE_UPSERT,
            profileId: item.profileId,
          });
        }
      } catch (error) {
        publishFailures.push({
          type: SHADOW_STATE_UPSERT,
          profileId: item.profileId,
        });
      }
    }

    for (const item of deleteQueue) {
      try {
        const template = await buildProfileDeleteEventTemplateFn(privateKeyHex, {
          profileId: item.profileId,
          deletedAt: item.deletedAt,
        });
        const signedEvent = await createSignedEventFn({
          ...template,
          privateKeyHex,
          createdAt: Math.floor(item.deletedAt / 1000),
        });
        const publishResult = await publishEventFn({
          relays,
          event: signedEvent,
          timeoutMs: normalizedTimeoutMs,
        });
        if (publishResult.acceptedCount > 0) {
          shadowState[item.profileId] = {
            state: SHADOW_STATE_DELETE,
            timestamp: item.deletedAt,
          };
          if (Object.hasOwn(localMutationsState, item.profileId)) {
            delete localMutationsState[item.profileId];
          }
          pushedCount += 1;
          if (tombstonesState[item.profileId] !== item.deletedAt) {
            tombstonesState[item.profileId] = item.deletedAt;
            tombstonesChanged = true;
          }
        } else {
          publishFailures.push({
            type: SHADOW_STATE_DELETE,
            profileId: item.profileId,
          });
        }
      } catch (error) {
        publishFailures.push({
          type: SHADOW_STATE_DELETE,
          profileId: item.profileId,
        });
      }
    }

    for (const item of settingsUpsertQueue) {
      try {
        const template = await buildSettingsUpsertEventTemplateFn(privateKeyHex, item.payload, {
          scope: item.scope,
          updatedAt: item.updatedAt,
        });
        const signedEvent = await createSignedEventFn({
          ...template,
          privateKeyHex,
          createdAt: Math.floor(item.updatedAt / 1000),
        });
        const publishResult = await publishEventFn({
          relays,
          event: signedEvent,
          timeoutMs: normalizedTimeoutMs,
        });
        if (publishResult.acceptedCount > 0) {
          settingsShadowState[item.scope] = {
            timestamp: item.updatedAt,
          };
          delete settingsLocalMutations[item.scope];
          pushedCount += 1;
          if (!pushedSettingsScopes.includes(item.scope)) {
            pushedSettingsScopes.push(item.scope);
          }
        } else {
          publishFailures.push({
            type: "settings_upsert",
            scope: item.scope,
          });
        }
      } catch (error) {
        publishFailures.push({
          type: "settings_upsert",
          scope: item.scope,
        });
      }
    }
  }

  const prunedShadow = pruneMapByTimestamp(shadowState, MAX_SYNC_SHADOW);
  const prunedTombstones = pruneMapByTimestamp(tombstonesState, MAX_SYNC_TOMBSTONES);

  await setStateFn(NOSTR_SYNC_PROFILE_SHADOW_STATE_KEY, prunedShadow);
  if (tombstonesChanged || Object.keys(prunedTombstones).length !== Object.keys(tombstonesState).length) {
    await setStateFn(NOSTR_SYNC_PROFILE_TOMBSTONES_STATE_KEY, prunedTombstones);
  }
  await saveLocalNostrProfileMutations(localMutationsState, { setStateFn });
  await saveNostrSettingsShadow(settingsShadowState, { setStateFn });
  await saveLocalNostrSettingsMutations(settingsLocalMutations, { setStateFn });

  const status = await setStatus({
    nowMs: attemptAt,
    setNostrSyncStatusFn,
    previousStatus,
    pushedCount,
    pulledCount,
    lastError: publishFailures.length
      ? `${publishFailures.length} event(s) failed to publish.`
      : pullWarnings.join(" "),
    success: publishFailures.length === 0,
  });

  return buildSuccessResult({
    status,
    publishFailures,
    pushedSettingsScopes,
    pulledSettingsScopes,
  });
}
