import {
  getProfiles as loadProfiles,
  saveProfiles as persistProfiles,
} from "../../lib/repo/profiles.js";
import {
  getSettings as loadSettings,
  updateSettings as persistSettingsPatch,
} from "../../lib/repo/settings.js";

export async function getProfiles() {
  return loadProfiles();
}

export async function saveProfiles(profiles) {
  return persistProfiles(profiles);
}

export async function getSettings() {
  return loadSettings();
}

export async function updateSettings(patch) {
  return persistSettingsPatch(patch);
}
