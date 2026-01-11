/*
 * CamKeeper - Bookmark manager for webcam model profiles
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

import { SETTINGS_KEY } from "../db.js";
import { SETTINGS_DEFAULTS } from "../domain/settings.js";
import { sanitizeProfile } from "../domain/sanitizers.js";
import { parseUrl } from "../domain/urls.js";
import { findDuplicateProfile } from "../domain/profiles.js";
import { getProfiles, saveProfiles } from "../repo/profiles.js";
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

  async function quickAddFromActiveTab() {
    if (!chrome.tabs?.query) return;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const parsed = tab?.url ? parseUrl(tab.url) : null;
    if (!parsed) return;

    const profiles = await getProfiles();
    const candidate = { cams: [{ site: parsed.site, username: parsed.username }] };
    const duplicate = findDuplicateProfile(profiles, candidate, null);
    if (duplicate) return;

    const now = Date.now();
    const profile = sanitizeProfile({
      name: parsed.username,
      cams: [{ site: parsed.site, username: parsed.username }],
      createdAt: now,
      updatedAt: now,
    });
    await saveProfiles([...profiles, profile]);
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
  chrome.commands?.onCommand.addListener((command) => {
    if (command === "quick-add-profile") {
      quickAddFromActiveTab();
    }
  });
}
