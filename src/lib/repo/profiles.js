/*
 * CamKeeper - Cross-site model profile and bookmark manager
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
} from "../db.js";
import { createId } from "../domain/ids.js";
import { migrateLegacyCams, sanitizeProfile } from "../domain/sanitizers.js";
import { updateViewHistory } from "../domain/visits.js";

const LEGACY_KEYS = ["camkeeper_profiles", "profiles", "cams", "camkeeper_profiles_v1"];

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

function extractProfiles(data) {
  let profiles = coerceProfiles(data[STORAGE_KEY]);
  let shouldPersist = false;

  if (!profiles.length) {
    const legacyCandidates = LEGACY_KEYS.map((key) => data[key]);
    for (const candidate of legacyCandidates) {
      const legacyProfiles = coerceProfiles(candidate);
      if (legacyProfiles.length) {
        profiles = legacyProfiles;
        shouldPersist = true;
        break;
      }
    }

    if (!profiles.length && Array.isArray(data.cams) && data.cams.length) {
      profiles = migrateLegacyCams(data.cams);
      shouldPersist = true;
    }
  }

  return {
    profiles: (profiles || []).map((profile) => sanitizeProfile(profile)),
    shouldPersist,
  };
}

export async function getProfiles() {
  const keys = [STORAGE_KEY, ...LEGACY_KEYS];
  const data = await readLocal(keys);
  let { profiles, shouldPersist } = extractProfiles(data);

  if (!profiles.length) {
    const syncData = await readSync(keys);
    const syncResult = extractProfiles(syncData);
    profiles = syncResult.profiles;
    shouldPersist = syncResult.shouldPersist || shouldPersist;
  }

  profiles = profiles.map((profile) => {
    const next = { ...profile };
    if (!next.id) {
      next.id = createId();
      shouldPersist = true;
    }
    if (!next.createdAt) {
      next.createdAt = Date.now();
      shouldPersist = true;
    }
    if (!next.updatedAt) {
      next.updatedAt = next.createdAt;
      shouldPersist = true;
    }
    return next;
  });

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
  const cleaned = sanitizeProfile(profile);
  if (!cleaned.id) {
    cleaned.id = createId();
  }
  if (!cleaned.createdAt) {
    cleaned.createdAt = Date.now();
  }
  if (!cleaned.updatedAt) {
    cleaned.updatedAt = cleaned.createdAt;
  }
  return persistProfile(cleaned);
}

export async function saveProfiles(profiles) {
  const cleaned = (profiles || []).map((profile) => sanitizeProfile(profile));
  cleaned.forEach((profile) => {
    if (!profile.id) {
      profile.id = createId();
    }
    if (!profile.createdAt) {
      profile.createdAt = Date.now();
    }
    if (!profile.updatedAt) {
      profile.updatedAt = profile.createdAt;
    }
  });
  return persistProfiles(cleaned);
}

export async function deleteProfile(id) {
  return removeProfile(id);
}

export async function recordProfileView({ site, username, endedAt, durationMs }) {
  if (!site || !username) return false;
  const profiles = await getProfiles();
  let updatedAny = false;
  const updated = profiles.map((profile) => {
    const cams = (profile.cams || []).map((cam) => {
      if (cam.site === site && cam.username === username) {
        updatedAny = true;
        const existing = Number.isFinite(cam.viewMs) ? cam.viewMs : 0;
        const history = Array.isArray(cam.viewHistory) ? cam.viewHistory : [];
        const nextHistory = updateViewHistory(history, endedAt, durationMs);
        return {
          ...cam,
          viewMs: existing + durationMs,
          lastViewedAt: endedAt,
          viewHistory: nextHistory,
        };
      }
      return cam;
    });
    return { ...profile, cams };
  });
  if (!updatedAny) return false;
  await saveProfiles(updated);
  return true;
}
