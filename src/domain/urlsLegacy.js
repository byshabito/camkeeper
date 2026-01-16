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

export function buildFallbackSites(sites) {
  return Object.keys(sites || {}).reduce((acc, key) => {
    acc[key] = acc[key] || { host: key };
    return acc;
  }, {});
}

export function matchLegacyUrl(url, sites) {
  const trimmed = (url || "").trim().toLowerCase();
  if (!trimmed.startsWith("http")) return null;
  const withoutProtocol = trimmed.replace(/^https?:\/\//, "");
  const host = withoutProtocol.split("/")[0];
  const path = withoutProtocol.slice(host.length + 1);
  if (!host || !path) return null;
  const siteKey = Object.keys(sites || {}).find(
    (key) => host === key || host.endsWith(`.${key}`),
  );
  if (!siteKey) return null;
  const username = path.split("/").filter(Boolean)[0] || "";
  if (!username) return null;
  return { site: siteKey, username };
}
