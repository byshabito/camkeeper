export const SETTINGS_KEY = "camkeeper_settings_v1";
export const STORAGE_KEY = "camkeeper_profiles_v1";

const storage = chrome.storage.local;
const syncStorage = chrome.storage?.sync;

async function readStorage(area, keys) {
  if (!area) return {};
  return new Promise((resolve) => {
    area.get(keys, (res) => resolve(res || {}));
  });
}

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
  return [];
}

export async function readLocal(keys) {
  return readStorage(storage, keys);
}

export async function readSync(keys) {
  return readStorage(syncStorage, keys);
}

async function loadProfiles() {
  const data = await readStorage(storage, STORAGE_KEY);
  let profiles = coerceProfiles(data[STORAGE_KEY]);

  if (!profiles.length && syncStorage) {
    const syncData = await readStorage(syncStorage, STORAGE_KEY);
    profiles = coerceProfiles(syncData[STORAGE_KEY]);
  }

  return profiles;
}

async function persistProfiles(profiles) {
  const next = profiles || [];
  await new Promise((resolve) => storage.set({ [STORAGE_KEY]: next }, resolve));
  return next;
}

export async function getProfiles() {
  return loadProfiles();
}

export async function getProfile(id) {
  const profiles = await loadProfiles();
  return profiles.find((profile) => profile.id === id) || null;
}

export async function saveProfile(profile) {
  const profiles = await loadProfiles();
  const updated = profiles.some((item) => item.id === profile.id)
    ? profiles.map((item) => (item.id === profile.id ? profile : item))
    : [...profiles, profile];
  await persistProfiles(updated);
  return profile;
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
