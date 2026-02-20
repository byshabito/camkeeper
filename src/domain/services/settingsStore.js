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
import { applySettingsPatch, normalizeSettings } from "../settings.js";
import { debugLog } from "../debugLogging.js";

const SETTINGS_CRUD_LOG_PREFIX = "[CamKeeper][crud][settings]";

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

export async function saveSettings(settings) {
  const normalized = normalizeSettings(settings);
  await persistSettings(normalized);
  logSettingsCrud("saveSettings", {
    keys: Object.keys(normalized),
  });
  return normalized;
}

export async function updateSettings(patch) {
  const current = await loadSettings();
  const next = applySettingsPatch(current, patch);
  await persistSettings(next);
  logSettingsCrud("updateSettings", {
    changedKeys: getChangedTopLevelKeys(current, next),
  });
  return next;
}
