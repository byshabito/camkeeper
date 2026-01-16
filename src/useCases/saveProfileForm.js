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

import { createId } from "../domain/ids.js";
import { mergeProfiles, findDuplicateProfile } from "../domain/profiles.js";
import { getSiteRegistry } from "../domain/siteRegistry.js";
import { sanitizeCams, sanitizeProfile, sanitizeSocials } from "../domain/sanitizers.js";
import { splitTags, normalizeText } from "../domain/text.js";
import { getProfiles, saveProfiles } from "../repo/profiles.js";

export async function saveProfileForm({ editingId, attachSelectedId, formData }) {
  const sites = getSiteRegistry();
  const cams = sanitizeCams(formData.cams, { sites });
  if (!cams.length) {
    return { error: "Add at least one livestream username." };
  }

  const socials = sanitizeSocials(formData.socials);
  const profile = sanitizeProfile({
    id: editingId || createId(),
    name: formData.name.trim(),
    cams,
    socials,
    tags: splitTags(formData.tags),
    folder: formData.folder,
    notes: formData.notes.trim(),
    updatedAt: Date.now(),
  }, { sites });
  if (!profile.id) {
    profile.id = createId();
  }

  const profiles = await getProfiles();
  let updated = profiles.slice();
  let attachTargetId = null;

  if (editingId) {
    updated = updated.map((item) => {
      if (item.id !== editingId) return item;
      const mergedCams = mergeCamStats(item.cams || [], profile.cams || []);
      return sanitizeProfile({
        ...item,
        ...profile,
        id: item.id,
        cams: mergedCams,
        pinned: item.pinned,
        createdAt: item.createdAt,
        updatedAt: Date.now(),
      }, { sites });
    });
  } else if (attachSelectedId) {
    updated = updated.map((item) => {
      if (item.id !== attachSelectedId) return item;
      return mergeProfiles(item, profile, { sites });
    });
    attachTargetId = attachSelectedId;
  } else {
    const duplicate = findDuplicateProfile(updated, profile, null, { sites });
    if (duplicate) {
      updated = updated.map((item) =>
        item.id === duplicate.id ? mergeProfiles(item, profile, { sites }) : item,
      );
    } else {
      updated.push(profile);
    }
  }

  await saveProfiles(updated);
  const targetId = editingId || attachTargetId || profile.id;
  const savedProfile = updated.find((item) => item.id === targetId) || profile;

  return { profiles: updated, savedProfile, targetId };
}

function mergeCamStats(existingCams, updatedCams) {
  const existingMap = new Map(
    (existingCams || []).map((cam) => [
      `${normalizeText(cam.site)}:${normalizeText(cam.username)}`,
      cam,
    ]),
  );
  return (updatedCams || []).map((cam) => {
    const key = `${normalizeText(cam.site)}:${normalizeText(cam.username)}`;
    const existing = existingMap.get(key);
    if (!existing) return cam;
    return {
      ...cam,
      viewMs: Number.isFinite(existing.viewMs) ? existing.viewMs : 0,
      lastViewedAt: Number.isFinite(existing.lastViewedAt) ? existing.lastViewedAt : null,
      viewHistory: Array.isArray(existing.viewHistory) ? existing.viewHistory : [],
    };
  });
}
