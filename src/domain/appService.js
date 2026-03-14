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

import { SETTINGS_KEY } from "../repo/db.js";
import {
  getProfiles as loadProfiles,
  getProfile as loadProfile,
  saveProfile as persistProfile,
  saveProfiles as persistProfiles,
  deleteProfile as removeProfile,
  recordProfileView as persistProfileView,
} from "./services/profilesStore.js";
import {
  getSettings as loadSettings,
  saveSettings as persistSettings,
  updateSettings as persistSettingsPatch,
} from "./services/settingsStore.js";
import {
  getState as loadState,
  setState as persistState,
} from "./services/stateStore.js";
import {
  getSiteRegistry as loadSiteRegistry,
  setSiteRegistry as persistSiteRegistry,
  getSiteRegistryKeys as loadSiteRegistryKeys,
} from "./siteRegistry.js";
import {
  quickAddProfile as quickAddProfileUseCase,
  mergeProfilesByIds as mergeProfilesByIdsUseCase,
  saveProfileForm as saveProfileFormUseCase,
  loadListPreferences as loadListPreferencesUseCase,
  getNostrSyncConfig as getNostrSyncConfigUseCase,
  updateNostrSyncConfig as updateNostrSyncConfigUseCase,
  getNostrSyncSecret as getNostrSyncSecretUseCase,
  hasNostrSyncSecret as hasNostrSyncSecretUseCase,
  setNostrSyncSecret as setNostrSyncSecretUseCase,
  generateNostrSyncSecret as generateNostrSyncSecretUseCase,
  clearNostrSyncSecret as clearNostrSyncSecretUseCase,
  getNostrSyncStatus as getNostrSyncStatusUseCase,
  setNostrSyncStatus as setNostrSyncStatusUseCase,
  clearNostrSyncStatus as clearNostrSyncStatusUseCase,
  syncNostrNow as syncNostrNowUseCase,
} from "./useCases/index.js";

export async function getProfiles() {
  return loadProfiles();
}

export async function getProfile(id) {
  return loadProfile(id);
}

export async function saveProfile(profile, options) {
  return persistProfile(profile, options);
}

export async function saveProfiles(profiles, options) {
  return persistProfiles(profiles, options);
}

export async function deleteProfile(id, options) {
  return removeProfile(id, options);
}

export async function recordProfileView(input, options) {
  return persistProfileView(input, options);
}

export async function getSettings() {
  return loadSettings();
}

export async function saveSettings(settings, options) {
  return persistSettings(settings, options);
}

export async function updateSettings(patch, options) {
  return persistSettingsPatch(patch, options);
}

export async function getState(key) {
  return loadState(key);
}

export async function setState(key, value) {
  return persistState(key, value);
}

export function getSiteRegistry() {
  return loadSiteRegistry();
}

export function setSiteRegistry(siteEntries) {
  return persistSiteRegistry(siteEntries);
}

export function getSiteRegistryKeys() {
  return loadSiteRegistryKeys();
}

export async function quickAddProfile(input) {
  return quickAddProfileUseCase(input);
}

export async function mergeProfilesByIds(ids) {
  return mergeProfilesByIdsUseCase(ids);
}

export async function saveProfileForm(input) {
  return saveProfileFormUseCase(input);
}

export async function loadListPreferences(input) {
  return loadListPreferencesUseCase(input);
}

export async function getNostrSyncConfig() {
  return getNostrSyncConfigUseCase();
}

export async function updateNostrSyncConfig(patch) {
  return updateNostrSyncConfigUseCase(patch);
}

export async function getNostrSyncSecret() {
  return getNostrSyncSecretUseCase();
}

export async function hasNostrSyncSecret() {
  return hasNostrSyncSecretUseCase();
}

export async function setNostrSyncSecret(value) {
  return setNostrSyncSecretUseCase(value);
}

export async function generateNostrSyncSecret() {
  return generateNostrSyncSecretUseCase();
}

export async function clearNostrSyncSecret() {
  return clearNostrSyncSecretUseCase();
}

export async function getNostrSyncStatus() {
  return getNostrSyncStatusUseCase();
}

export async function setNostrSyncStatus(status) {
  return setNostrSyncStatusUseCase(status);
}

export async function clearNostrSyncStatus() {
  return clearNostrSyncStatusUseCase();
}

export async function syncNostrNow(input) {
  return syncNostrNowUseCase(input);
}

export function isSettingsStorageChange({ area, changes }) {
  if (area !== "local") return false;
  return Boolean(changes && changes[SETTINGS_KEY]);
}
