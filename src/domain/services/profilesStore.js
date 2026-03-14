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

import { readLocal, readSync, setState, STORAGE_KEY } from "../../repo/db.js";
import {
  getProfile as loadProfile,
  getProfiles as loadProfiles,
  saveProfiles as persistProfiles,
} from "../../repo/profiles.js";
import {
  LEGACY_PROFILE_KEYS,
  migrateProfilesFromStorage,
  normalizeProfileForStorage,
  normalizeProfilesForStorage,
} from "../migrations/profiles.js";
import { applyProfileView } from "../profileViews.js";
import { debugLog } from "../debugLogging.js";
import { trackLocalProfilePersistence } from "./nostrSyncMutationStore.js";

const PROFILES_IDB_MIGRATED_STATE_KEY = "camkeeper_profiles_idb_migrated_v1";
const MIGRATION_LOG_PREFIX = "[CamKeeper][profiles-migration]";
const CRUD_LOG_PREFIX = "[CamKeeper][crud][profiles]";
const SYNC_ORIGIN_LOCAL = "local";

let migrationReady = false;
let migrationPromise = null;

function logMigration(message, details) {
  debugLog(MIGRATION_LOG_PREFIX, message, details);
}

function logProfilesCrud(message, details) {
  debugLog(CRUD_LOG_PREFIX, message, details);
}

function profilesDiffer(currentProfiles, normalizedProfiles) {
  try {
    return JSON.stringify(currentProfiles || []) !== JSON.stringify(normalizedProfiles || []);
  } catch (error) {
    return true;
  }
}

async function markProfilesMigrationComplete() {
  await setState(PROFILES_IDB_MIGRATED_STATE_KEY, true);
  migrationReady = true;
}

async function ensureProfilesMigration() {
  if (migrationReady) return;
  if (!migrationPromise) {
    migrationPromise = (async () => {
      try {
        logMigration("checking migration state");

        const migrationState = await readLocal(PROFILES_IDB_MIGRATED_STATE_KEY);
        if (migrationState[PROFILES_IDB_MIGRATED_STATE_KEY]) {
          migrationReady = true;
          logMigration("marker already set, skipping migration");
          return;
        }

        const existingProfiles = await loadProfiles();
        if (existingProfiles.length) {
          const normalizedExistingProfiles = normalizeProfilesForStorage(existingProfiles);
          if (profilesDiffer(existingProfiles, normalizedExistingProfiles)) {
            await persistProfiles(normalizedExistingProfiles);
            logMigration("normalized existing IndexedDB profiles", {
              count: normalizedExistingProfiles.length,
            });
          }
          await markProfilesMigrationComplete();
          logMigration("IndexedDB already has profiles, migration skipped", {
            count: existingProfiles.length,
          });
          return;
        }

        const keys = [STORAGE_KEY, ...LEGACY_PROFILE_KEYS];
        logMigration("reading legacy profiles from chrome.storage.local");
        const data = await readLocal(keys);
        let { profiles, shouldPersist } = migrateProfilesFromStorage({
          data,
          storageKey: STORAGE_KEY,
          legacyKeys: LEGACY_PROFILE_KEYS,
        });

        if (!profiles.length) {
          logMigration("no local legacy profiles found, checking chrome.storage.sync");
          const syncData = await readSync(keys);
          const syncResult = migrateProfilesFromStorage({
            data: syncData,
            storageKey: STORAGE_KEY,
            legacyKeys: LEGACY_PROFILE_KEYS,
          });
          profiles = syncResult.profiles;
          shouldPersist = syncResult.shouldPersist;
        }

        if (profiles.length && shouldPersist) {
          logMigration("persisting migrated profiles to IndexedDB", { count: profiles.length });
          await persistProfiles(profiles);
        } else {
          logMigration("no legacy profiles found to migrate");
        }

        await markProfilesMigrationComplete();
        logMigration("migration complete and marker saved");
      } catch (error) {
        console.warn(`${MIGRATION_LOG_PREFIX} migration failed`, error);
        throw error;
      }
    })().finally(() => {
      migrationPromise = null;
    });
  }
  await migrationPromise;
}

export async function getProfiles() {
  await ensureProfilesMigration();
  return loadProfiles();
}

export async function getProfile(id) {
  await ensureProfilesMigration();
  return loadProfile(id);
}

export async function saveProfile(profile, options = {}) {
  await ensureProfilesMigration();
  const profiles = await loadProfiles();
  const normalized = normalizeProfileForStorage(profile);
  const nextProfiles = profiles.some((item) => item.id === normalized.id)
    ? profiles.map((item) => (item.id === normalized.id ? normalized : item))
    : [...profiles, normalized];
  const savedProfiles = await saveProfiles(nextProfiles, options);
  const saved = savedProfiles.find((item) => item.id === normalized.id) || normalized;
  logProfilesCrud("saveProfile", {
    id: saved?.id || normalized?.id || null,
    syncOrigin: options?.syncOrigin || SYNC_ORIGIN_LOCAL,
  });
  return saved;
}

export async function saveProfiles(profiles, { syncOrigin = SYNC_ORIGIN_LOCAL } = {}) {
  await ensureProfilesMigration();
  const previousProfiles = await loadProfiles();
  const normalized = normalizeProfilesForStorage(profiles);
  const saved = await persistProfiles(normalized);
  if (syncOrigin === SYNC_ORIGIN_LOCAL) {
    await trackLocalProfilePersistence({
      previousProfiles,
      nextProfiles: normalized,
      getStateFn: readLocalState,
      setStateFn: setState,
      now: Date.now,
    });
  }
  logProfilesCrud("saveProfiles", {
    count: Array.isArray(saved) ? saved.length : 0,
    syncOrigin,
  });
  return saved;
}

async function readLocalState(key) {
  const state = await readLocal(key);
  return state[key];
}

export async function deleteProfile(id, options = {}) {
  await ensureProfilesMigration();
  const profiles = await loadProfiles();
  const updated = profiles.filter((profile) => profile.id !== id);
  const remaining = await saveProfiles(updated, options);
  logProfilesCrud("deleteProfile", {
    id: id || null,
    remainingCount: Array.isArray(remaining) ? remaining.length : 0,
    syncOrigin: options?.syncOrigin || SYNC_ORIGIN_LOCAL,
  });
  return remaining;
}

export async function recordProfileView({ site, username, endedAt, durationMs }, options = {}) {
  await ensureProfilesMigration();
  const profiles = await loadProfiles();
  const result = applyProfileView({
    profiles,
    site,
    username,
    endedAt,
    durationMs,
  });
  if (!result.updated) return false;
  logProfilesCrud("recordProfileView", {
    site,
    username,
    durationMs,
    syncOrigin: options?.syncOrigin || SYNC_ORIGIN_LOCAL,
  });
  await saveProfiles(result.profiles, {
    syncOrigin: options?.syncOrigin || SYNC_ORIGIN_LOCAL,
  });
  return true;
}
