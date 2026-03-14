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
  getSettings as loadSettings,
  saveSettings as persistSettings,
} from "../../repo/settings.js";
import { readLocal, setState } from "../../repo/db.js";
import { applySettingsPatch, normalizeSettings } from "../settings.js";
import { debugLog } from "../debugLogging.js";
import { markLivestreamSitesChanged } from "./nostrSyncSettingsMutationStore.js";

const SETTINGS_CRUD_LOG_PREFIX = "[CamKeeper][crud][settings]";
const SYNC_ORIGIN_LOCAL = "local";

function logSettingsCrud(message, details) {
  debugLog(SETTINGS_CRUD_LOG_PREFIX, message, details);
}

function areSameSettingsValue(left, right) {
  if (left === right) return true;
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch (error) {
    return false;
  }
}

function getChangedTopLevelKeys(current, next) {
  const keys = new Set([
    ...Object.keys(current || {}),
    ...Object.keys(next || {}),
  ]);
  return Array.from(keys).filter((key) => !areSameSettingsValue(current?.[key], next?.[key]));
}

export async function getSettings() {
  return normalizeSettings(await loadSettings());
}

export async function saveSettings(settings, { syncOrigin = SYNC_ORIGIN_LOCAL } = {}) {
  const current = normalizeSettings(await loadSettings());
  const normalized = normalizeSettings(settings);
  await persistSettings(normalized);
  if (syncOrigin === SYNC_ORIGIN_LOCAL) {
    await markLivestreamSitesChanged({
      previousSettings: current,
      nextSettings: normalized,
      getStateFn: async (key) => (await readLocal(key))[key],
      setStateFn: setState,
      now: Date.now,
    });
  }
  logSettingsCrud("saveSettings", {
    keys: Object.keys(normalized),
    syncOrigin,
  });
  return normalized;
}

export async function updateSettings(patch, { syncOrigin = SYNC_ORIGIN_LOCAL } = {}) {
  const current = normalizeSettings(await loadSettings());
  const next = applySettingsPatch(current, patch);
  await persistSettings(next);
  if (syncOrigin === SYNC_ORIGIN_LOCAL) {
    await markLivestreamSitesChanged({
      previousSettings: current,
      nextSettings: next,
      getStateFn: async (key) => (await readLocal(key))[key],
      setStateFn: setState,
      now: Date.now,
    });
  }
  logSettingsCrud("updateSettings", {
    changedKeys: getChangedTopLevelKeys(current, next),
    syncOrigin,
  });
  return next;
}
