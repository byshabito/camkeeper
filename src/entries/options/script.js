import { loadProfiles, sanitizeProfile, saveProfiles } from "../../lib/storage.js";

const SETTINGS_KEY = "camkeeper_settings_v1";
const DEFAULT_VISIT_DELAY_MS = 20 * 1000;
const DEFAULT_VISIT_COOLDOWN_MS = 10 * 60 * 1000;

const exportButton = document.getElementById("export-button");
const importInput = document.getElementById("import-input");
const visitDelayInput = document.getElementById("visit-delay");
const visitCooldownInput = document.getElementById("visit-cooldown");
const onlineCheckInput = document.getElementById("online-check");
const onlineCheckIntervalInput = document.getElementById("online-check-interval");
const visitSaveButton = document.getElementById("visit-save");

function secondsFromMs(ms) {
  return Math.round(ms / 1000);
}

function minutesFromMs(ms) {
  return Math.round(ms / 60000);
}

function setDefaultInputs() {
  if (visitDelayInput && !visitDelayInput.value) {
    visitDelayInput.value = String(secondsFromMs(DEFAULT_VISIT_DELAY_MS));
  }
  if (visitCooldownInput && !visitCooldownInput.value) {
    visitCooldownInput.value = String(minutesFromMs(DEFAULT_VISIT_COOLDOWN_MS));
  }
}

async function loadSettings() {
  if (!visitDelayInput || !visitCooldownInput || !onlineCheckInput || !onlineCheckIntervalInput)
    return;

  const data = await new Promise((resolve) => {
    chrome.storage.local.get(SETTINGS_KEY, (res) => resolve(res));
  });
  const settings = data[SETTINGS_KEY] || {};
  const delayMs = Number.isFinite(settings.visitDelayMs)
    ? settings.visitDelayMs
    : DEFAULT_VISIT_DELAY_MS;
  const cooldownMs = Number.isFinite(settings.visitCooldownMs)
    ? settings.visitCooldownMs
    : DEFAULT_VISIT_COOLDOWN_MS;
  const onlineChecksEnabled =
    typeof settings.onlineChecksEnabled === "boolean" ? settings.onlineChecksEnabled : true;
  const onlineCheckIntervalMinutes = Number.isFinite(settings.onlineCheckIntervalMinutes)
    ? settings.onlineCheckIntervalMinutes
    : 3;

  visitDelayInput.value = String(secondsFromMs(delayMs));
  visitCooldownInput.value = String(minutesFromMs(cooldownMs));
  onlineCheckInput.checked = onlineChecksEnabled;
  onlineCheckIntervalInput.value = String(onlineCheckIntervalMinutes);
}

async function saveSettings() {
  if (!visitDelayInput || !visitCooldownInput || !onlineCheckInput || !onlineCheckIntervalInput)
    return;

  const delaySeconds = Math.max(5, Number(visitDelayInput.value) || 20);
  const cooldownMinutes = Math.max(1, Number(visitCooldownInput.value) || 10);
  const settings = {
    visitDelayMs: delaySeconds * 1000,
    visitCooldownMs: cooldownMinutes * 60 * 1000,
    onlineChecksEnabled: onlineCheckInput.checked,
    onlineCheckIntervalMinutes: Math.max(3, Number(onlineCheckIntervalInput.value) || 3),
  };
  await new Promise((resolve) => {
    chrome.storage.local.set({ [SETTINGS_KEY]: settings }, resolve);
  });
}

if (exportButton) {
  exportButton.addEventListener("click", async () => {
    const profiles = await loadProfiles();
    const data = JSON.stringify(profiles, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "camkeeper-bookmarks.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  });
}

if (importInput) {
  importInput.addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error("Invalid data");
      const imported = data.map((item) => sanitizeProfile(item));
      await saveProfiles(imported);
    } catch (error) {
      console.error("Import failed:", error);
    } finally {
      event.target.value = "";
    }
  });
}

if (visitSaveButton) {
  visitSaveButton.addEventListener("click", async () => {
    await saveSettings();
    await loadSettings();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setDefaultInputs();
  loadSettings();
});
