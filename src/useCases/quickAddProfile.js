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

import { sanitizeProfile } from "../domain/sanitizers.js";
import { getSiteRegistry } from "../domain/siteRegistry.js";
import { findDuplicateProfile } from "../domain/profiles.js";
import { parseUrl } from "../domain/urls.js";
import { buildFallbackSites, matchLegacyUrl } from "../domain/urlsLegacy.js";
import { getProfiles, saveProfiles } from "../repo/profiles.js";

function filterSitesByParsedUrl(url, sites) {
  if (!url) return {};
  const parsed = parseUrl(url, sites);
  if (!parsed) return {};
  return { [parsed.site]: sites[parsed.site] };
}


export async function quickAddProfile({ tab, sites = getSiteRegistry(), now = Date.now } = {}) {
  const profiles = await getProfiles();
  const availableSites = Object.keys(sites || {}).length ? sites : getSiteRegistry();
  if (!tab?.url || !Object.keys(availableSites || {}).length) {
    return { added: false, reason: "no_match" };
  }
  const url = tab.url;
  const normalizedUrl = url.trim();
  let parsed = parseUrl(normalizedUrl, availableSites);
  if (!parsed) {
    const fallbackSites = buildFallbackSites(availableSites);
    parsed = parseUrl(normalizedUrl, fallbackSites);
  }
  if (!parsed) {
    const legacyMatch = matchLegacyUrl(normalizedUrl, availableSites);
    if (legacyMatch) {
      parsed = legacyMatch;
    }
  }
  if (!parsed) {
    return { added: false, reason: "no_match" };
  }

  const candidate = { cams: [{ site: parsed.site, username: parsed.username }] };
  const comparisonSites = Object.keys(filterSitesByParsedUrl(tab?.url, availableSites)).length
    ? filterSitesByParsedUrl(tab?.url, availableSites)
    : buildFallbackSites(availableSites);
  const duplicate = findDuplicateProfile(profiles, candidate, null, {
    sites: comparisonSites,
  });
  if (duplicate) return { added: false, reason: "duplicate" };

  const timestamp = now();
  const profile = sanitizeProfile({
    name: parsed.username,
    cams: [{ site: parsed.site, username: parsed.username }],
    createdAt: timestamp,
    updatedAt: timestamp,
  }, { sites: filterSitesByParsedUrl(tab?.url, availableSites) });
  await saveProfiles([...profiles, profile]);
  return { added: true, profile };
}
