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

function readIconCache(storageKey) {
  try {
    const raw = window.sessionStorage?.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function hydrateIconCache(cache, storageKey) {
  const stored = readIconCache(storageKey);
  Object.entries(stored).forEach(([key, value]) => {
    if (!cache.has(key) && typeof value === "string" && value) {
      cache.set(key, value);
    }
  });
}

function persistIconCache(cache, storageKey) {
  if (!window.sessionStorage) return;
  try {
    const payload = {};
    cache.forEach((value, key) => {
      if (typeof value === "string" && value) {
        payload[key] = value;
      }
    });
    window.sessionStorage.setItem(storageKey, JSON.stringify(payload));
  } catch (error) {
    return;
  }
}

export async function loadIconSet({
  paths,
  cache,
  storageKey,
  getAssetUrl = (path) => chrome.runtime.getURL(path),
  fetchText = (url) => fetch(url).then((response) => (response.ok ? response.text() : "")),
}) {
  hydrateIconCache(cache, storageKey);
  const entries = Object.entries(paths).filter(([key]) => !cache.has(key));
  if (!entries.length) return;
  await Promise.all(
    entries.map(async ([key, path]) => {
      try {
        const text = await fetchText(getAssetUrl(path));
        if (!text) return;
        cache.set(key, text);
      } catch (error) {
        return;
      }
    }),
  );
  persistIconCache(cache, storageKey);
}
