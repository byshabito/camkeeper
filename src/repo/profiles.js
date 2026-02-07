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
  saveProfile as persistProfile,
  saveProfiles as persistProfiles,
  deleteProfile as removeProfile,
  getProfile as loadProfile,
  getProfiles as loadProfiles,
} from "./db.js";

export async function getProfiles() {
  return loadProfiles();
}

export async function getProfile(id) {
  return loadProfile(id);
}

export async function saveProfile(profile) {
  return persistProfile(profile);
}

export async function saveProfiles(profiles) {
  return persistProfiles(profiles);
}

export async function deleteProfile(id) {
  return removeProfile(id);
}
