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

import {
  buildSites,
  normalizeLivestreamHost,
  normalizeLivestreamSiteEntries,
  setSitesFromSettings,
} from "../../domain/sites.js";
import { getProfiles, saveProfiles } from "../../repo/profiles.js";
import { getSettings, updateSettings } from "../../repo/settings.js";
import { sanitizeProfile } from "../../domain/sanitizers.js";

const RELEASE_TIMESTAMP = "2026-01-14T14:49:30+01:00";
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
      date.getUTCDate(),
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
      const existing = byHost.get(entry.host);
      if (existing && entry.label) existing.label = entry.label;
      if (existing && entry.abbr) existing.abbr = entry.abbr;
      if (existing && entry.color) existing.color = entry.color;
    });
    return normalizeLivestreamSiteEntries(Array.from(byHost.values()));
  }

  function renderLivestreamSiteRows(entries) {
    if (!livestreamSitesList) return;
    const sites = buildSites(entries);
    livestreamSitesList.textContent = "";
    Object.values(sites).forEach((site) => {
      livestreamSitesList.appendChild(
        createSiteRow({
          host: site.host,
          label: site.label,
          abbr: site.abbr,
          color: site.color,
        }, site),
      );
    });
  }

  async function handleExport() {
    const profiles = await getProfiles();
    if (!profiles.length) {
      showBackupFeedback("No profiles to export.");
      return;
    }
    const payload = JSON.stringify(
      profiles.map((profile) => sanitizeProfile(profile)),
      null,
      2,
    );
    const fileName = `camkeeper-profiles-${new Date().toISOString().split("T")[0]}.json`;
    try {
      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showBackupFeedback(`Exported ${profiles.length} profile${profiles.length === 1 ? "" : "s"}.`);
    } catch (error) {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
        const profileLabel = `${profiles.length} profile${profiles.length === 1 ? "" : "s"}`;
        showBackupFeedback(`Copied ${profileLabel} to clipboard.`);
        return;
      }
      showBackupFeedback("Export failed. Please try again.");
    }
  }

  async function handleImport() {
    if (!allowFileImport) return;
    const input = importInput;
    if (!input?.files?.length) return;
    const file = input.files[0];
    input.value = "";
    let parsed = null;
    try {
      parsed = JSON.parse(await file.text());
    } catch (error) {
      showBackupFeedback("Import failed. Please use a valid JSON file.");
      return;
    }
    if (!Array.isArray(parsed)) {
      showBackupFeedback("Import failed. Expected a JSON array.");
      return;
    }
    const existing = await getProfiles();
    const sanitized = parsed
      .map((profile) => sanitizeProfile(profile))
      .filter((profile) => profile.cams.length || profile.socials.length);
    const byId = new Map(existing.map((profile) => [profile.id, profile]));
    sanitized.forEach((profile) => {
      if (!profile.id || byId.has(profile.id)) {
        profile.id = crypto.randomUUID();
      }
      byId.set(profile.id, profile);
    });
    const imported = Array.from(byId.values());
    const addedCount = imported.length - existing.length;
    await saveProfiles(imported);
    if (onProfilesChanged) {
      await onProfilesChanged(imported);
    }
    showBackupFeedback(
      addedCount > 0
        ? `Imported ${addedCount} profile${addedCount === 1 ? "" : "s"}.`
        : "No new profiles imported.",
    );
  }

  async function refreshMeta() {
    if (metaRelease) {
      metaRelease.textContent = formatReleaseTimestamp(RELEASE_TIMESTAMP);
    }
    if (metaDeveloper) {
      metaDeveloper.textContent = DEVELOPER_NAME;
      metaDeveloper.href = DEVELOPER_URL;
    }
    if (metaSource) {
      metaSource.textContent = "GitHub";
      metaSource.href = SOURCE_URL;
    }
    if (metaLicense) {
      metaLicense.textContent = "GPL-3.0";
      metaLicense.href = LICENSE_URL;
    }
    if (metaVersion) {
      const manifest = await fetch(chrome.runtime.getURL("manifest.json")).then((res) =>
        res.json(),
      );
      metaVersion.textContent = manifest.version;
    }
  }

  function openBitcoinModal() {
    if (!bitcoinModal) return;
    bitcoinModal.classList.remove("hidden");
    bitcoinModal.classList.add("open");
    bitcoinModal.setAttribute("aria-hidden", "false");
  }

  function closeBitcoinModal() {
    if (!bitcoinModal) return;
    bitcoinModal.classList.remove("open");
    bitcoinModal.classList.add("hidden");
    bitcoinModal.setAttribute("aria-hidden", "true");
  }

  function showBitcoinToast(message) {
    if (!bitcoinToast) return;
    bitcoinToast.textContent = message;
    bitcoinToast.classList.add("visible");
    if (bitcoinToastTimeout) window.clearTimeout(bitcoinToastTimeout);
    bitcoinToastTimeout = window.setTimeout(() => {
      bitcoinToast.classList.remove("visible");
      bitcoinToast.textContent = "";
    }, 2000);
  }

  const handleBitcoinCopy = async (event) => {
    const value = event?.currentTarget?.getAttribute("data-copy-value");
    if (!value) return;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      showBitcoinToast("Copied!");
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    showBitcoinToast("Copied!");
  };

  const bindEvents = (bindings) => {
    bindings.forEach(({ element, event, handler }) => {
      if (!element) return;
      element.addEventListener(event, handler);
    });
  };

  bindEvents([
    {
      element: exportButton,
      event: "click",
      handler: handleExport,
    },
    {
      element: importButton,
      event: "click",
      handler: () => importInput?.click(),
    },
    {
      element: importInput,
      event: "change",
      handler: handleImport,
    },
    {
      element: viewMetricSelect,
      event: "change",
      handler: async () => {
        await persistSettings();
        showSettingsFeedback("Settings saved successfully.");
      },
    },
    {
      element: addLivestreamSiteButton,
      event: "click",
      handler: () => {
        if (!livestreamSitesList) return;
        const defaultSite = {
          host: "",
          label: "",
          abbr: "",
          color: "#64748b",
        };
        const row = createSiteRow({}, defaultSite);
        livestreamSitesList.appendChild(row);
        row.querySelector('[data-field="host"]')?.focus();
      },
    },
    {
      element: livestreamSitesList,
      event: "change",
      handler: async () => {
        await persistSettings();
        showSettingsFeedback("Settings saved successfully.");
      },
    },
    {
      element: bitcoinDonateButton,
      event: "click",
      handler: openBitcoinModal,
    },
    {
      element: bitcoinModalCloseBottom,
      event: "click",
      handler: closeBitcoinModal,
    },
  ]);

  bitcoinValues.forEach((value) => {
    value.addEventListener("click", handleBitcoinCopy);
  });

  bitcoinModal?.addEventListener("click", (event) => {
    if (event.target === bitcoinModal) closeBitcoinModal();
  });

  loadSettings();
  refreshMeta();
}
