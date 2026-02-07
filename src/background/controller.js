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

import { SETTINGS_DEFAULTS } from "../domain/settings.js";
import {
  getSettings,
  getSiteRegistry,
  isSettingsStorageChange,
  quickAddProfile,
  setSiteRegistry,
} from "../domain/appService.js";
import { initVisitTracking } from "./visits.js";

export function initBackground() {
  const state = {
    activeTabId: null,
  };
  const settings = { ...SETTINGS_DEFAULTS };

  const visits = initVisitTracking(state, () => {});

  async function loadSettings() {
    const nextSettings = await getSettings();
    setSiteRegistry(nextSettings.livestreamSites || []);
    settings.viewMetric = nextSettings.viewMetric;
    await visits.setMode(settings.viewMetric);
  }

  async function quickAddFromActiveTab() {
    if (!chrome.tabs?.query) return;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const result = await quickAddProfile({ tab, sites: getSiteRegistry() });
    if (!result.added) return;
    showQuickAddBadge();
  }

  function showQuickAddBadge() {
    if (!chrome.action?.setBadgeText) return;
    chrome.action.setBadgeBackgroundColor({ color: "#21a861" });
    chrome.action.setBadgeText({ text: "✓" });
    setTimeout(() => {
      chrome.action.setBadgeText({ text: "" });
    }, 2000);
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (isSettingsStorageChange({ area, changes })) {
      loadSettings();
    }
  });

  loadSettings();

  chrome.tabs.onActivated.addListener((info) => visits.onTabActivated(info));
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => visits.onTabUpdated(tabId, changeInfo));
  chrome.tabs.onRemoved.addListener((tabId) => visits.onTabRemoved(tabId));
  chrome.windows.onFocusChanged.addListener((windowId) => visits.onWindowFocusChanged(windowId));
  chrome.commands?.onCommand.addListener((command) => {
    if (command === "quick-add-profile") {
      quickAddFromActiveTab();
    }
  });
}
