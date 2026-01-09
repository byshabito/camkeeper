import { getProfiles, getSettings, saveProfiles, saveSettings } from "../../lib/db.js";
import {
  DEFAULT_BACKGROUND_ONLINE_CHECKS_ENABLED,
  DEFAULT_DEBUG_LOGS_ENABLED,
  DEFAULT_ONLINE_CHECK_INTERVAL_MINUTES,
} from "../../config/background.js";
import { sanitizeProfile } from "../../lib/storage.js";
const RELEASE_TIMESTAMP = "2026-01-09T22:47:30+01:00";
const DEVELOPER_NAME = "Shabito";
const DEVELOPER_URL = "https://github.com/byshabito";
const SOURCE_URL = "https://github.com/byshabito/camkeeper";
const LICENSE_URL = "https://github.com/byshabito/camkeeper/blob/main/LICENSE";

const exportButton = document.getElementById("export-button");
const importInput = document.getElementById("import-input");
const onlineCheckInput = document.getElementById("online-check");
const backgroundOnlineCheckInput = document.getElementById("background-online-check");
const onlineCheckIntervalInput = document.getElementById("online-check-interval");
const debugLogsInput = document.getElementById("debug-logs");
const visitSaveButton = document.getElementById("visit-save");
const metaVersion = document.getElementById("meta-version");
const metaRelease = document.getElementById("meta-release");
const metaDeveloper = document.getElementById("meta-developer");
const metaSource = document.getElementById("meta-source");
const metaLicense = document.getElementById("meta-license");

function formatReleaseTimestamp(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  const pad = (value) => String(value).padStart(2, "0");
  const timeZoneName = new Intl.DateTimeFormat(undefined, {
    timeZone: "UTC",
    timeZoneName: "short",
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;
  const suffix = timeZoneName ? ` ${timeZoneName}` : "";
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate()
  )} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}${suffix}`;
}

function syncOnlineToggleState() {
  if (!onlineCheckInput || !backgroundOnlineCheckInput) return;
  const enabled = onlineCheckInput.checked;
  backgroundOnlineCheckInput.disabled = !enabled;
  if (!enabled) {
    backgroundOnlineCheckInput.checked = false;
  }
}

async function loadSettings() {
  if (
    !onlineCheckInput ||
    !backgroundOnlineCheckInput ||
    !onlineCheckIntervalInput ||
    !debugLogsInput
  )
    return;

  const settings = await getSettings();
  const onlineChecksEnabled =
    typeof settings.onlineChecksEnabled === "boolean" ? settings.onlineChecksEnabled : true;
  const backgroundOnlineChecksEnabled =
    typeof settings.backgroundOnlineChecksEnabled === "boolean"
      ? settings.backgroundOnlineChecksEnabled
      : DEFAULT_BACKGROUND_ONLINE_CHECKS_ENABLED;
  const onlineCheckIntervalMinutes = Number.isFinite(settings.onlineCheckIntervalMinutes)
    ? settings.onlineCheckIntervalMinutes
    : DEFAULT_ONLINE_CHECK_INTERVAL_MINUTES;
  const debugLogsEnabled =
    typeof settings.debugLogsEnabled === "boolean"
      ? settings.debugLogsEnabled
      : DEFAULT_DEBUG_LOGS_ENABLED;

  onlineCheckInput.checked = onlineChecksEnabled;
  backgroundOnlineCheckInput.checked = backgroundOnlineChecksEnabled;
  syncOnlineToggleState();
  onlineCheckIntervalInput.value = String(onlineCheckIntervalMinutes);
  debugLogsInput.checked = debugLogsEnabled;
}

async function persistSettings() {
  if (
    !onlineCheckInput ||
    !backgroundOnlineCheckInput ||
    !onlineCheckIntervalInput ||
    !debugLogsInput
  )
    return;

  const settings = {
    onlineChecksEnabled: onlineCheckInput.checked,
    backgroundOnlineChecksEnabled:
      onlineCheckInput.checked && backgroundOnlineCheckInput.checked,
    onlineCheckIntervalMinutes: Math.max(
      DEFAULT_ONLINE_CHECK_INTERVAL_MINUTES,
      Number(onlineCheckIntervalInput.value) || DEFAULT_ONLINE_CHECK_INTERVAL_MINUTES
    ),
    debugLogsEnabled: debugLogsInput.checked,
  };
  await saveSettings(settings);
}

function loadMetadata() {
  if (!metaVersion) return;
  const manifest = chrome.runtime.getManifest();
  metaVersion.textContent = manifest.version;
  metaRelease.textContent = formatReleaseTimestamp(RELEASE_TIMESTAMP);
  metaDeveloper.textContent = DEVELOPER_NAME;
  metaDeveloper.href = DEVELOPER_URL;
  metaSource.textContent = SOURCE_URL;
  metaSource.href = SOURCE_URL;
  metaLicense.textContent = "MIT License";
  metaLicense.href = LICENSE_URL;
}

if (exportButton) {
  exportButton.addEventListener("click", async () => {
    const profiles = await getProfiles();
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
    await persistSettings();
    await loadSettings();
  });
}

if (onlineCheckInput) {
  onlineCheckInput.addEventListener("change", () => {
    syncOnlineToggleState();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadSettings();
  loadMetadata();
});
