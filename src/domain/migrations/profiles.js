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

import { createId } from "../ids.js";
import { getSiteRegistry } from "../siteRegistry.js";
import { migrateLegacyCams, sanitizeProfile } from "../sanitizers.js";

export const LEGACY_PROFILE_KEYS = [
  "camkeeper_profiles",
  "profiles",
  "cams",
  "camkeeper_profiles_v1",
];

export function migrateProfilesFromStorage({
  data,
  storageKey,
  legacyKeys,
  now = Date.now,
  sites = getSiteRegistry(),
}) {
  const { profiles, shouldPersist } = extractProfilesFromStorage({
    data,
    storageKey,
    legacyKeys,
    sites,
  });
  const nowValue = now();
  let updated = false;
  const normalized = profiles.map((profile) => {
    const cleaned = sanitizeProfile(profile, { sites });
    const { profile: next, changed } = applyProfileMetadata(cleaned, nowValue);
    if (changed) updated = true;
    return next;
  });
  return { profiles: normalized, shouldPersist: shouldPersist || updated };
}

export function normalizeProfileForStorage(
  profile,
  { now = Date.now, sites = getSiteRegistry() } = {},
) {
  const cleaned = sanitizeProfile(profile, { sites });
  const { profile: normalized } = applyProfileMetadata(cleaned, now());
  return normalized;
}

export function normalizeProfilesForStorage(
  profiles,
  { now = Date.now, sites = getSiteRegistry() } = {},
) {
  const nowValue = now();
  return (profiles || []).map((profile) => {
    const cleaned = sanitizeProfile(profile, { sites });
    const { profile: normalized } = applyProfileMetadata(cleaned, nowValue);
    return normalized;
  });
}

function applyProfileMetadata(profile, nowValue) {
  let changed = false;
  const next = { ...profile };
  if (!next.id) {
    next.id = createId();
    changed = true;
  }
  if (!next.createdAt) {
    next.createdAt = nowValue;
    changed = true;
  }
  if (!next.updatedAt) {
    next.updatedAt = next.createdAt;
    changed = true;
  }
  return { profile: next, changed };
}

function coerceProfiles(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      return coerceProfiles(JSON.parse(raw));
    } catch (error) {
      return [];
    }
  }
  if (typeof raw === "object") {
    if (Array.isArray(raw.profiles)) return raw.profiles;
    if (Array.isArray(raw.items)) return raw.items;
    if (Array.isArray(raw.bookmarks)) return raw.bookmarks;
    const values = Object.values(raw);
    if (values.length && values.every((value) => typeof value === "object")) {
      const hasProfileShape = values.some(
        (value) =>
          value &&
          (Array.isArray(value.cams) ||
            Array.isArray(value.platforms) ||
            Array.isArray(value.sites) ||
            typeof value.name === "string"),
      );
      if (hasProfileShape) return values;
    }
  }
  return [];
}

function extractProfilesFromStorage({ data, storageKey, legacyKeys, sites }) {
  let profiles = coerceProfiles(data[storageKey]);
  let shouldPersist = false;

  if (!profiles.length) {
    const legacyCandidates = legacyKeys.map((key) => data[key]);
    for (const candidate of legacyCandidates) {
      const legacyProfiles = coerceProfiles(candidate);
      if (legacyProfiles.length) {
        profiles = legacyProfiles;
        shouldPersist = true;
        break;
      }
    }

    if (!profiles.length && Array.isArray(data.cams) && data.cams.length) {
      profiles = migrateLegacyCams(data.cams, { sites });
      shouldPersist = true;
    }
  }

  return {
    profiles: profiles || [],
    shouldPersist,
  };
}
