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
  deleteProfile as removeProfile,
  getProfile as loadProfile,
  getProfiles as loadProfiles,
  saveProfile as persistProfile,
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

const PROFILES_IDB_MIGRATED_STATE_KEY = "camkeeper_profiles_idb_migrated_v1";
const MIGRATION_LOG_PREFIX = "[CamKeeper][profiles-migration]";
const CRUD_LOG_PREFIX = "[CamKeeper][crud][profiles]";

let migrationReady = false;
let migrationPromise = null;

function logMigration(message, details) {
  debugLog(MIGRATION_LOG_PREFIX, message, details);
}

function logProfilesCrud(message, details) {
  debugLog(CRUD_LOG_PREFIX, message, details);
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
          await markProfilesMigrationComplete();
          logMigration("IndexedDB already has profiles, migration skipped", {
            count: existingProfiles.length,
          });
          return;
        }

        const keys = [STORAGE_KEY, ...LEGACY_PROFILE_KEYS];
        logMigration("reading legacy profiles from chrome.storage.local");
        const data = await readLocal(keys);
        let { profiles } = migrateProfilesFromStorage({
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
        }

        if (profiles.length) {
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

export async function saveProfile(profile) {
  await ensureProfilesMigration();
  const normalized = normalizeProfileForStorage(profile);
  const saved = await persistProfile(normalized);
  logProfilesCrud("saveProfile", {
    id: saved?.id || normalized?.id || null,
  });
  return saved;
}

export async function saveProfiles(profiles) {
  await ensureProfilesMigration();
  const normalized = normalizeProfilesForStorage(profiles);
  const saved = await persistProfiles(normalized);
  logProfilesCrud("saveProfiles", {
    count: Array.isArray(saved) ? saved.length : 0,
  });
  return saved;
}

export async function deleteProfile(id) {
  await ensureProfilesMigration();
  const remaining = await removeProfile(id);
  logProfilesCrud("deleteProfile", {
    id: id || null,
    remainingCount: Array.isArray(remaining) ? remaining.length : 0,
  });
  return remaining;
}

export async function recordProfileView({ site, username, endedAt, durationMs }) {
  await ensureProfilesMigration();
  const profiles = await getProfiles();
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
  });
  await saveProfiles(result.profiles);
  return true;
}
