/*
 * CamKeeper - Cross-site model profile and bookmark manager
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

import { getProfiles, saveProfiles } from "../repo/profiles.js";
import { getSettings, updateSettings } from "../repo/settings.js";
import { sanitizeProfile } from "../domain/sanitizers.js";

const RELEASE_TIMESTAMP = "2026-01-11T19:06:37+01:00";
const DEVELOPER_NAME = "Shabito";
const DEVELOPER_URL = "https://github.com/byshabito";
const SOURCE_URL = "https://github.com/byshabito/camkeeper";
const LICENSE_URL = "https://www.gnu.org/licenses/gpl-3.0.en.html";

export function initSettingsPanel({ elements, onProfilesChanged, allowFileImport = true } = {}) {
  const {
    exportButton,
    importInput,
    viewMetricSelect,
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
    if (viewMetricSelect) {
      viewMetricSelect.value = settings.viewMetric || "focus";
    }
  }

  async function persistSettings() {
    await updateSettings({
      viewMetric: viewMetricSelect ? viewMetricSelect.value : undefined,
    });
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
      importInput.addEventListener("click", handlePopupImport);
      if (importLabel) importLabel.addEventListener("click", handlePopupImport);
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
