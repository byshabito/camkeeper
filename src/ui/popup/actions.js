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

import { getProfiles, saveProfiles, updateSettings } from "./store.js";
import { getState } from "../../repo/state.js";
import { ACTIVE_VIEW_SESSIONS_STATE_KEY } from "../../domain/stateKeys.js";
import { loadListPreferences } from "../../useCases/loadListPreferences.js";
import { mergeProfilesByIds } from "../../useCases/mergeProfiles.js";
import { saveProfileForm } from "../../useCases/saveProfileForm.js";

export async function fetchProfiles() {
  return getProfiles();
}

export async function persistProfiles(profiles) {
  await saveProfiles(profiles);
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

export { loadListPreferences, mergeProfilesByIds, saveProfileForm };

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
