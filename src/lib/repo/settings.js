/*
 * CamKeeper - Bookmark manager for webcam model profiles
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
} from "../db.js";
import { applySettingsPatch, normalizeSettings } from "../domain/settings.js";

export async function getSettings() {
  return normalizeSettings(await loadSettings());
}

export async function saveSettings(settings) {
  const normalized = normalizeSettings(settings);
  await persistSettings(normalized);
  return normalized;
}

export async function updateSettings(patch) {
  const current = await loadSettings();
  const next = applySettingsPatch(current, patch);
  await persistSettings(next);
  return next;
}
