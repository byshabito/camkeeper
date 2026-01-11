import {
  getSettings as loadSettings,
  saveSettings as persistSettings,
} from "../db.js";
import { applySettingsPatch, normalizeSettings } from "../domain/settings.js";

export async function getSettings() {
  return normalizeSettings(await loadSettings());
}

export async function saveSettings(settings) {
  const normalized = normalizeSettings(settings);
  await persistSettings(normalized);
  return normalized;
}

export async function updateSettings(patch) {
  const current = await loadSettings();
  const next = applySettingsPatch(current, patch);
  await persistSettings(next);
  return next;
}
