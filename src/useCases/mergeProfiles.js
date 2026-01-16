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

import { getSiteRegistry } from "../domain/siteRegistry.js";
import { mergeProfiles } from "../domain/profiles.js";
import { getProfiles, saveProfiles } from "../repo/profiles.js";

export async function mergeProfilesByIds(ids) {
  if (ids.length < 2) return { profiles: await getProfiles(), merged: null };
  const profiles = await getProfiles();
  const base = profiles.find((item) => item.id === ids[0]);
  if (!base) return { profiles, merged: null };
  const toMerge = profiles.filter((item) => ids.includes(item.id) && item.id !== base.id);
  const sites = getSiteRegistry();
  const merged = toMerge.reduce((acc, item) => mergeProfiles(acc, item, { sites }), base);
  const updated = profiles.filter((item) => !ids.includes(item.id)).concat(merged);
  await saveProfiles(updated);
  return { profiles: updated, merged };
}
