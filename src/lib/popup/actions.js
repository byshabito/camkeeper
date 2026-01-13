/*
 * CamKeeper - Creator profile and livestream bookmark manager
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

import { getProfiles, getSettings, saveProfiles, updateSettings } from "./store.js";
import { findDuplicateProfile, mergeProfiles } from "../domain/profiles.js";
import { normalizeText, splitTags } from "../domain/text.js";
import { createId } from "../domain/ids.js";
import { sanitizeCams, sanitizeProfile, sanitizeSocials } from "../domain/sanitizers.js";
import { getState } from "../repo/state.js";
import { ACTIVE_VIEW_SESSIONS_STATE_KEY } from "../domain/stateKeys.js";

export async function fetchProfiles() {
  return getProfiles();
}

export async function persistProfiles(profiles) {
  await saveProfiles(profiles);
}

export async function loadListPreferences({ sortOptions, defaultSort }) {
  const settings = await getSettings();
  const preferred = settings.lastSort;
  const sortKey = sortOptions.has(preferred) ? preferred : defaultSort;
  return {
    sortKey,
    folderFilter: settings.lastFolderFilter || "",
    folderOrder: Array.isArray(settings.lastFolderOrder) ? settings.lastFolderOrder : [],
  };
}

export async function saveSortPreference(value, sortOptions) {
  if (!sortOptions.has(value)) return;
  await updateSettings({ lastSort: value });
}

export async function saveFolderPreference(value) {
  await updateSettings({ lastFolderFilter: value || "" });
}

export async function handleFolderFilterChange(value) {
  const nextValue = value || "";
  await saveFolderPreference(nextValue);
  return nextValue;
}

export async function saveFolderOrderPreference(order) {
  await updateSettings({ lastFolderOrder: Array.isArray(order) ? order : [] });
}

export async function toggleProfilePin(profileId) {
  const profiles = await getProfiles();
  const updated = profiles.map((item) =>
    item.id === profileId ? { ...item, pinned: !item.pinned } : item,
  );
  await saveProfiles(updated);
  return {
    profiles: updated,
    updatedProfile: updated.find((item) => item.id === profileId) || null,
  };
}

export async function deleteProfilesByIds(ids) {
  if (!ids.length) return [];
  const profiles = await getProfiles();
  const updated = profiles.filter((item) => !ids.includes(item.id));
  await saveProfiles(updated);
  return updated;
}

export async function deleteProfileById(profileId) {
  const profiles = await getProfiles();
  const updated = profiles.filter((item) => item.id !== profileId);
  await saveProfiles(updated);
  return updated;
}

export async function mergeProfilesByIds(ids) {
  if (ids.length < 2) return { profiles: await getProfiles(), merged: null };
  const profiles = await getProfiles();
  const base = profiles.find((item) => item.id === ids[0]);
  if (!base) return { profiles, merged: null };
  const toMerge = profiles.filter((item) => ids.includes(item.id) && item.id !== base.id);
  const merged = toMerge.reduce((acc, item) => mergeProfiles(acc, item), base);
  const updated = profiles.filter((item) => !ids.includes(item.id)).concat(merged);
  await saveProfiles(updated);
  return { profiles: updated, merged };
}

export async function saveProfileForm({ editingId, attachSelectedId, formData }) {
  const cams = sanitizeCams(formData.cams);
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
  });
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
      });
    });
  } else if (attachSelectedId) {
    updated = updated.map((item) => {
      if (item.id !== attachSelectedId) return item;
      return mergeProfiles(item, profile);
    });
    attachTargetId = attachSelectedId;
  } else {
    const duplicate = findDuplicateProfile(updated, profile, null);
    if (duplicate) {
      updated = updated.map((item) =>
        item.id === duplicate.id ? mergeProfiles(item, profile) : item,
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

function coerceSession(stored) {
  if (!stored || typeof stored !== "object") return null;
  if (!Number.isFinite(stored.startedAt)) return null;
  if (typeof stored.site !== "string" || typeof stored.username !== "string") return null;
  return stored;
}

export async function fetchLiveViewDeltas() {
  const now = Date.now();
  const deltas = new Map();
  const stored = await getState(ACTIVE_VIEW_SESSIONS_STATE_KEY);
  if (Array.isArray(stored)) {
    stored.forEach((session) => {
      const normalized = coerceSession(session);
      if (!normalized) return;
      const delta = now - normalized.startedAt;
      if (delta <= 0) return;
      deltas.set(`${normalized.site}:${normalized.username}`, delta);
    });
  }
  return deltas;
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
