import { SETTINGS_KEY } from "../db.js";
import { SETTINGS_DEFAULTS } from "../domain/settings.js";
import { getSettings } from "../repo/settings.js";
import { initVisitTracking } from "./visits.js";

export function initBackground() {
  const state = {
    activeTabId: null,
  };
  const settings = { ...SETTINGS_DEFAULTS };

  const visits = initVisitTracking(state, () => {});

  async function loadSettings() {
    const nextSettings = await getSettings();
    settings.viewMetric = nextSettings.viewMetric;
    await visits.setMode(settings.viewMetric);
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
}
