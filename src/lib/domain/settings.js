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

export const SETTINGS_DEFAULTS = Object.freeze({
  viewMetric: "open",
  lastSort: "month",
  lastFolderFilter: "",
  lastFolderOrder: [],
});

export function normalizeSettings(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    ...SETTINGS_DEFAULTS,
    viewMetric: (() => {
      if (source.viewMetric === "page") return "open";
      if (source.viewMetric === "open" || source.viewMetric === "focus") return source.viewMetric;
      return SETTINGS_DEFAULTS.viewMetric;
    })(),
    lastSort: typeof source.lastSort === "string" ? source.lastSort : SETTINGS_DEFAULTS.lastSort,
    lastFolderFilter:
      typeof source.lastFolderFilter === "string"
        ? source.lastFolderFilter
        : SETTINGS_DEFAULTS.lastFolderFilter,
    lastFolderOrder: Array.isArray(source.lastFolderOrder)
      ? source.lastFolderOrder.filter((item) => typeof item === "string")
      : SETTINGS_DEFAULTS.lastFolderOrder,
  };
}

export function applySettingsPatch(current, patch) {
  const base = normalizeSettings(current);
  const next = typeof patch === "function" ? patch(base) : { ...base, ...patch };
  return normalizeSettings(next);
}
