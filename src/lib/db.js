import { loadProfiles, saveProfiles as persistProfiles, sanitizeProfile } from "./storage.js";

export const SETTINGS_KEY = "camkeeper_settings_v1";
export const STORAGE_KEY = "camkeeper_profiles_v1";

const storage = chrome.storage.local;

export async function getProfiles() {
  return loadProfiles();
}

export async function getProfile(id) {
  const profiles = await loadProfiles();
  return profiles.find((profile) => profile.id === id) || null;
}

export async function saveProfile(profile) {
  const cleaned = sanitizeProfile(profile);
  const profiles = await loadProfiles();
  const updated = profiles.some((item) => item.id === cleaned.id)
    ? profiles.map((item) => (item.id === cleaned.id ? cleaned : item))
    : [...profiles, cleaned];
  await persistProfiles(updated);
  return cleaned;
}

export async function saveProfiles(profiles) {
  return persistProfiles(profiles);
}

export async function deleteProfile(id) {
  const profiles = await loadProfiles();
  const updated = profiles.filter((profile) => profile.id !== id);
  await persistProfiles(updated);
  return updated;
}

export async function getSettings() {
  const data = await new Promise((resolve) => {
    storage.get(SETTINGS_KEY, (res) => resolve(res));
  });
  return data[SETTINGS_KEY] || {};
}

export async function saveSettings(settings) {
  await new Promise((resolve) => {
    storage.set({ [SETTINGS_KEY]: settings }, resolve);
  });
  return settings;
}

export async function getState(key) {
  const data = await new Promise((resolve) => {
    storage.get(key, (res) => resolve(res));
  });
  return data[key];
}

export async function setState(key, value) {
  await new Promise((resolve) => {
    storage.set({ [key]: value }, resolve);
  });
  return value;
}
