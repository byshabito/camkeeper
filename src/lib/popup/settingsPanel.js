/*
 * CamKeeper - Creator profile and livestream bookmark manager
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

import {
  buildSites,
  normalizeLivestreamHost,
  normalizeLivestreamSiteEntries,
  setSitesFromSettings,
} from "../domain/sites.js";
import { getProfiles, saveProfiles } from "../repo/profiles.js";
import { getSettings, updateSettings } from "../repo/settings.js";
import { sanitizeProfile } from "../domain/sanitizers.js";

const RELEASE_TIMESTAMP = "2026-01-11T19:20:06+01:00";
const DEVELOPER_NAME = "Shabito";
const DEVELOPER_URL = "https://github.com/byshabito";
const SOURCE_URL = "https://github.com/byshabito/camkeeper";
const LICENSE_URL = "https://www.gnu.org/licenses/gpl-3.0.en.html";

export function initSettingsPanel({
  elements,
  onProfilesChanged,
  onSitesChanged,
  allowFileImport = true,
} = {}) {
  const {
    exportButton,
    importButton,
    importInput,
    viewMetricSelect,
    livestreamSitesList,
    addLivestreamSiteButton,
    settingsFeedback,
    backupFeedback,
    bitcoinDonateButton,
    bitcoinModal,
    bitcoinModalCloseBottom,
    bitcoinToast,
    metaVersion,
    metaRelease,
    metaDeveloper,
    metaSource,
    metaLicense,
  } = elements || {};

  const bitcoinValues = bitcoinModal
    ? Array.from(bitcoinModal.querySelectorAll("[data-copy-value]"))
    : [];
  const createFeedbackToast = (target) => {
    let timeoutId = null;
    return (message) => {
      if (!target) return;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      target.textContent = message;
      target.classList.add("visible");
      timeoutId = window.setTimeout(() => {
        target.classList.remove("visible");
        target.textContent = "";
        timeoutId = null;
      }, 2400);
    };
  };

  const showSettingsFeedback = createFeedbackToast(settingsFeedback);
  const showBackupFeedback = createFeedbackToast(backupFeedback || settingsFeedback);
  let bitcoinToastTimeout = null;

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

  async function loadSettings() {
    const settings = await getSettings();
    setSitesFromSettings(settings.livestreamSites);
    if (viewMetricSelect) {
      viewMetricSelect.value = settings.viewMetric || "focus";
    }
    if (livestreamSitesList) {
      renderLivestreamSiteRows(settings.livestreamSites || []);
    }
  }

  async function persistSettings() {
    const next = {
      viewMetric: viewMetricSelect ? viewMetricSelect.value : undefined,
    };
    if (livestreamSitesList) {
      next.livestreamSites = collectLivestreamSites();
    }
    const updated = await updateSettings(next);
    if (onSitesChanged) {
      await onSitesChanged(updated);
    }
  }

  function normalizeColor(value) {
    if (typeof value !== "string") return "";
    const trimmed = value.trim();
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed) ? trimmed : "";
  }

  function createSiteRow(entry, siteDefaults) {
    const row = document.createElement("div");
    row.classList.add("site-row");

    const hostInput = document.createElement("input");
    hostInput.type = "text";
    hostInput.placeholder = "twitch.tv";
    hostInput.value = entry.host || "";
    hostInput.setAttribute("data-field", "host");

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.placeholder = "Label";
    labelInput.value = entry.label || siteDefaults.label || "";
    labelInput.setAttribute("data-field", "label");

    const abbrInput = document.createElement("input");
    abbrInput.type = "text";
    abbrInput.placeholder = "Abbr";
    abbrInput.value = entry.abbr || siteDefaults.abbr || "";
    abbrInput.setAttribute("data-field", "abbr");

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = normalizeColor(entry.color) || siteDefaults.color || "#64748b";
    colorInput.setAttribute("data-field", "color");

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.classList.add("ghost");
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", async () => {
      row.remove();
      await persistSettings();
      await loadSettings();
      showSettingsFeedback("Settings saved successfully.");
    });

    row.appendChild(hostInput);
    row.appendChild(labelInput);
    row.appendChild(abbrInput);
    row.appendChild(colorInput);
    row.appendChild(removeButton);
    return row;
  }

  function collectLivestreamSites() {
    if (!livestreamSitesList) return [];
    const rows = Array.from(livestreamSitesList.querySelectorAll(".site-row"));
    const entries = [];
    rows.forEach((row) => {
      const host = normalizeLivestreamHost(
        row.querySelector('[data-field="host"]')?.value || "",
      );
      if (!host) return;
      const label = (row.querySelector('[data-field="label"]')?.value || "").trim();
      const abbr = (row.querySelector('[data-field="abbr"]')?.value || "").trim();
      const color = normalizeColor(row.querySelector('[data-field="color"]')?.value || "");
      entries.push({
        host,
        label,
        abbr,
        color,
      });
    });
    const byHost = new Map();
    entries.forEach((entry) => {
      if (!byHost.has(entry.host)) {
        byHost.set(entry.host, entry);
        return;
      }
      byHost.set(entry.host, { ...byHost.get(entry.host), ...entry });
    });
    return Array.from(byHost.values());
  }

  function renderLivestreamSiteRows(rawSites) {
    if (!livestreamSitesList) return;
    const entries = normalizeLivestreamSiteEntries(rawSites);
    const sites = buildSites(entries);
    livestreamSitesList.innerHTML = "";
    entries.forEach((entry) => {
      const siteDefaults = sites[entry.host] || {
        label: "",
        abbr: "",
        color: "#64748b",
      };
      const row = createSiteRow(entry, siteDefaults);
      livestreamSitesList.appendChild(row);
    });
    if (!entries.length) {
      const row = createSiteRow({ host: "", label: "", abbr: "", color: "" }, {
        label: "",
        abbr: "",
        color: "#64748b",
      });
      livestreamSitesList.appendChild(row);
    }
  }

  function openBitcoinModal() {
    if (!bitcoinModal) return;
    bitcoinModal.classList.remove("hidden");
  }

  function closeBitcoinModal() {
    if (!bitcoinModal) return;
    bitcoinModal.classList.add("hidden");
  }

  function showBitcoinToast(message) {
    if (!bitcoinToast) return;
    if (bitcoinToastTimeout) {
      clearTimeout(bitcoinToastTimeout);
      bitcoinToastTimeout = null;
    }
    bitcoinToast.textContent = message;
    bitcoinToast.classList.add("visible");
    bitcoinToastTimeout = window.setTimeout(() => {
      bitcoinToast.classList.remove("visible");
      bitcoinToast.textContent = "";
      bitcoinToastTimeout = null;
    }, 1600);
  }

  async function copyBitcoinValue(target) {
    const value = target.getAttribute("data-copy-value") || target.textContent || "";
    if (!value) return;
    await navigator.clipboard.writeText(value);
    showBitcoinToast("Copied to clipboard");
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
    metaLicense.textContent = "GPL-3.0-or-later";
    metaLicense.href = LICENSE_URL;
  }

  const formatBackupTimestamp = (date) => {
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(
      date.getUTCDate(),
    )}-${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(
      date.getUTCSeconds(),
    )}`;
  };

  if (exportButton) {
    exportButton.addEventListener("click", async () => {
      const profiles = await getProfiles();
    const data = JSON.stringify(profiles, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `camkeeper-profiles_${formatBackupTimestamp(new Date())}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    });
  }

  if (importInput) {
    const openOptionsPage = () => {
      if (chrome.runtime?.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      }
    };

    const importFromFile = async (file) => {
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!Array.isArray(data)) throw new Error("Invalid data");
        const imported = data.map((item) => sanitizeProfile(item));
        await saveProfiles(imported);
        showBackupFeedback("Import complete.");
        if (onProfilesChanged) await onProfilesChanged();
      } catch (error) {
        console.error("Import failed:", error);
      }
    };

    const importLabel = importInput.closest("label");
    if (!allowFileImport) {
      const trigger = importButton || importLabel || importInput;
      const handlePopupImport = async (event) => {
        event.preventDefault();
        if (window.showOpenFilePicker) {
          try {
            const [handle] = await window.showOpenFilePicker({
              types: [
                {
                  description: "JSON",
                  accept: { "application/json": [".json"] },
                },
              ],
              excludeAcceptAllOption: false,
              multiple: false,
            });
            const file = await handle.getFile();
            await importFromFile(file);
          } catch (error) {
            if (error?.name !== "AbortError") {
              console.error("Import failed:", error);
            }
          }
          return;
        }
        openOptionsPage();
        showSettingsFeedback("Import opens in the settings tab.");
      };
      if (trigger) trigger.addEventListener("click", handlePopupImport);
    }
    if (importButton) {
      importButton.addEventListener("click", () => {
        importInput.click();
      });
    }

    importInput.addEventListener("change", async (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      await importFromFile(file);
      event.target.value = "";
    });
  }

  if (viewMetricSelect) {
    viewMetricSelect.addEventListener("change", async () => {
      await persistSettings();
      await loadSettings();
      showSettingsFeedback("Settings saved successfully.");
    });
  }

  if (livestreamSitesList) {
    livestreamSitesList.addEventListener("change", async () => {
      await persistSettings();
      await loadSettings();
      showSettingsFeedback("Settings saved successfully.");
    });
  }

  if (addLivestreamSiteButton) {
    addLivestreamSiteButton.addEventListener("click", () => {
      if (!livestreamSitesList) return;
      const row = createSiteRow({ host: "", label: "", abbr: "", color: "" }, {
        label: "",
        abbr: "",
        color: "#64748b",
      });
      livestreamSitesList.appendChild(row);
      const hostInput = row.querySelector('[data-field="host"]');
      if (hostInput) hostInput.focus();
    });
  }

  if (bitcoinDonateButton) {
    bitcoinDonateButton.addEventListener("click", () => {
      openBitcoinModal();
    });
  }

  if (bitcoinModalCloseBottom) {
    bitcoinModalCloseBottom.addEventListener("click", () => {
      closeBitcoinModal();
    });
  }

  if (bitcoinModal) {
    bitcoinModal.addEventListener("click", (event) => {
      if (event.target === bitcoinModal) {
        closeBitcoinModal();
      }
    });
  }

  bitcoinValues.forEach((value) => {
    value.addEventListener("click", async () => {
      try {
        await copyBitcoinValue(value);
      } catch (error) {
        console.error("Copy failed:", error);
      }
    });
  });

  document.addEventListener("DOMContentLoaded", () => {
    loadSettings();
    loadMetadata();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!bitcoinModal || bitcoinModal.classList.contains("hidden")) return;
    closeBitcoinModal();
  });
}
