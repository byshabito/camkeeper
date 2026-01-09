import { migrateLegacyCams, sanitizeProfile } from "./storage.js";

export const SETTINGS_KEY = "camkeeper_settings_v1";
export const STORAGE_KEY = "camkeeper_profiles_v1";
const LEGACY_KEYS = ["camkeeper_profiles", "profiles", "cams"];

const storage = chrome.storage.local;
const syncStorage = chrome.storage?.sync;

function coerceProfiles(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      return coerceProfiles(JSON.parse(raw));
    } catch (error) {
      return [];
    }
  }
  if (typeof raw === "object") {
    if (Array.isArray(raw.profiles)) return raw.profiles;
    if (Array.isArray(raw.items)) return raw.items;
    if (Array.isArray(raw.bookmarks)) return raw.bookmarks;
    const values = Object.values(raw);
    if (values.length && values.every((value) => typeof value === "object")) {
      const hasProfileShape = values.some(
        (value) =>
          value &&
          (Array.isArray(value.cams) ||
            Array.isArray(value.platforms) ||
            Array.isArray(value.sites) ||
            typeof value.name === "string"),
      );
      if (hasProfileShape) return values;
    }
  }
  return [];
}

async function readStorage(area, keys) {
  if (!area) return {};
  return new Promise((resolve) => {
    area.get(keys, (res) => resolve(res || {}));
  });
}

function extractProfiles(data) {
  let profiles = coerceProfiles(data[STORAGE_KEY]);
  let shouldPersist = false;

  if (!profiles.length) {
    const legacyCandidates = [
      data.camkeeper_profiles,
      data.profiles,
      data.camkeeper_profiles_v1,
    ];
    for (const candidate of legacyCandidates) {
      const legacyProfiles = coerceProfiles(candidate);
      if (legacyProfiles.length) {
        profiles = legacyProfiles;
        shouldPersist = true;
        break;
      }
    }

    if (!profiles.length && Array.isArray(data.cams) && data.cams.length) {
      profiles = migrateLegacyCams(data.cams);
      shouldPersist = true;
    }
  }

  return {
    profiles: (profiles || []).map((profile) => sanitizeProfile(profile)),
    shouldPersist,
  };
}

async function loadProfiles() {
  const keys = [STORAGE_KEY, ...LEGACY_KEYS];
  const data = await readStorage(storage, keys);
  let { profiles, shouldPersist } = extractProfiles(data);

  if (!profiles.length && syncStorage) {
    const syncData = await readStorage(syncStorage, keys);
    const syncResult = extractProfiles(syncData);
    profiles = syncResult.profiles;
    shouldPersist = syncResult.shouldPersist || shouldPersist;
  }

  if (profiles.length && shouldPersist) {
    await persistProfiles(profiles);
  }

  return profiles;
}

async function persistProfiles(profiles) {
  const cleaned = (profiles || []).map((profile) => sanitizeProfile(profile));
  await new Promise((resolve) => storage.set({ [STORAGE_KEY]: cleaned }, resolve));
  return cleaned;
}

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
