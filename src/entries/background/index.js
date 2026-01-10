import { SETTINGS_KEY, getSettings } from "../../lib/db.js";
import { getDefaultSettings } from "../../config/background.js";
import { initVisitTracking } from "./visits.js";

const state = {
  activeTabId: null,
};
const settings = getDefaultSettings();

function logDebug(message, data) {
  if (!settings.debugLogsEnabled) return;
  console.log(message, data ?? {});
}

const visits = initVisitTracking(state, logDebug);

async function loadSettings() {
  const nextSettings = await getSettings();
  settings.debugLogsEnabled =
    typeof nextSettings.debugLogsEnabled === "boolean"
      ? nextSettings.debugLogsEnabled
      : settings.debugLogsEnabled;
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[SETTINGS_KEY]) {
    loadSettings();
  }
});

loadSettings();

chrome.tabs.onActivated.addListener((info) => visits.onTabActivated(info));
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => visits.onTabUpdated(tabId, changeInfo));
chrome.tabs.onRemoved.addListener((tabId) => visits.onTabRemoved(tabId));
chrome.windows.onFocusChanged.addListener((windowId) => visits.onWindowFocusChanged(windowId));
