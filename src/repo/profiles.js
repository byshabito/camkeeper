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
  saveProfile as persistProfile,
  saveProfiles as persistProfiles,
  deleteProfile as removeProfile,
  readLocal,
  readSync,
  STORAGE_KEY,
} from "./db.js";
import {
  LEGACY_PROFILE_KEYS,
  migrateProfilesFromStorage,
  normalizeProfileForStorage,
  normalizeProfilesForStorage,
} from "../domain/migrations/profiles.js";
import { applyProfileView } from "../domain/profileViews.js";

export async function getProfiles() {
  const keys = [STORAGE_KEY, ...LEGACY_PROFILE_KEYS];
  const data = await readLocal(keys);
  let { profiles, shouldPersist } = migrateProfilesFromStorage({
    data,
    storageKey: STORAGE_KEY,
    legacyKeys: LEGACY_PROFILE_KEYS,
  });

  if (!profiles.length) {
    const syncData = await readSync(keys);
    const syncResult = migrateProfilesFromStorage({
      data: syncData,
      storageKey: STORAGE_KEY,
      legacyKeys: LEGACY_PROFILE_KEYS,
    });
    profiles = syncResult.profiles;
    shouldPersist = syncResult.shouldPersist || shouldPersist;
  }

  if (profiles.length && shouldPersist) {
    await saveProfiles(profiles);
  }

  return profiles;
}

export async function getProfile(id) {
  const profiles = await getProfiles();
  return profiles.find((profile) => profile.id === id) || null;
}

export async function saveProfile(profile) {
  const normalized = normalizeProfileForStorage(profile);
  return persistProfile(normalized);
}

export async function saveProfiles(profiles) {
  const normalized = normalizeProfilesForStorage(profiles);
  return persistProfiles(normalized);
}

export async function deleteProfile(id) {
  return removeProfile(id);
}

export async function recordProfileView({ site, username, endedAt, durationMs }) {
  const profiles = await getProfiles();
  const result = applyProfileView({
    profiles,
    site,
    username,
    endedAt,
    durationMs,
  });
  if (!result.updated) return false;
  await saveProfiles(result.profiles);
  return true;
}
