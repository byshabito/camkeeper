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

import { getSiteRegistry, setSiteRegistry } from "../../domain/siteRegistry.js";
import {
  buildSites,
  normalizeLivestreamHost,
  normalizeLivestreamSiteEntries,
} from "../../domain/sites.js";
import {
  getProfiles,
  saveProfiles,
  getSettings,
  updateSettings,
  getNostrSyncConfig,
  updateNostrSyncConfig,
  getNostrSyncSecret,
  setNostrSyncSecret,
  generateNostrSyncSecret,
  clearNostrSyncSecret,
  getNostrSyncStatus,
  syncNostrNow,
} from "../../domain/appService.js";
import { sanitizeProfile } from "../../domain/sanitizers.js";

const RELEASE_TIMESTAMP = "2026-02-12T13:46:20+01:00";
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
    nostrSyncFeedback,
    nostrSyncEnabled,
    nostrSyncRelays,
    nostrSyncSaveConfigButton,
    nostrSyncSecretInput,
    nostrSyncShowSecret,
    nostrSyncSaveSecretButton,
    nostrSyncGenerateSecretButton,
    nostrSyncClearSecretButton,
    nostrSyncSecretState,
    nostrSyncNowButton,
    nostrSyncStatus,
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
  const showNostrFeedback = createFeedbackToast(nostrSyncFeedback || settingsFeedback);
  let bitcoinToastTimeout = null;
  let nostrConfig = null;
  let nostrStatus = null;
  let nostrSecretStored = false;
  let nostrSyncInProgress = false;

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

  function formatStatusTimestamp(timestamp) {
    if (!Number.isFinite(timestamp)) return "Never";
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "Never";
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  }

  function parseRelayLines(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function refreshNostrControls() {
    const syncEnabled = Boolean(nostrConfig?.enabled);
    if (nostrSyncEnabled) {
      nostrSyncEnabled.checked = syncEnabled;
      nostrSyncEnabled.disabled = nostrSyncInProgress;
    }
    if (nostrSyncSaveConfigButton) {
      nostrSyncSaveConfigButton.disabled = nostrSyncInProgress;
    }
    if (nostrSyncSaveSecretButton) {
      nostrSyncSaveSecretButton.disabled = nostrSyncInProgress;
    }
    if (nostrSyncGenerateSecretButton) {
      nostrSyncGenerateSecretButton.disabled = nostrSyncInProgress;
    }
    if (nostrSyncClearSecretButton) {
      nostrSyncClearSecretButton.disabled = nostrSyncInProgress || !nostrSecretStored;
    }
    if (nostrSyncNowButton) {
      nostrSyncNowButton.disabled = nostrSyncInProgress || !syncEnabled;
      nostrSyncNowButton.textContent = nostrSyncInProgress ? "Syncing..." : "Sync now";
    }
  }

  function renderNostrStatusText() {
    if (nostrSyncSecretState) {
      nostrSyncSecretState.textContent = nostrSecretStored
        ? "Private key is stored locally on this device."
        : "No private key stored.";
    }
    if (!nostrSyncStatus) return;
    if (!nostrStatus) {
      nostrSyncStatus.textContent = "No sync attempts yet.";
      return;
    }
    const relayCount = Array.isArray(nostrConfig?.relays) ? nostrConfig.relays.length : 0;
    const lines = [
      `Enabled: ${nostrConfig?.enabled ? "Yes" : "No"} | Relays: ${relayCount} | Key stored: ${nostrSecretStored ? "Yes" : "No"}`,
      `Last attempt: ${formatStatusTimestamp(nostrStatus.lastAttemptAt)}`,
      `Last success: ${formatStatusTimestamp(nostrStatus.lastSuccessAt)}`,
      `Last sync: pulled ${nostrStatus.pulledCount || 0}, pushed ${nostrStatus.pushedCount || 0}`,
    ];
    if (nostrStatus.lastError) {
      lines.push(`Last error: ${nostrStatus.lastError}`);
    }
    nostrSyncStatus.textContent = lines.join("\n");
  }

  async function refreshNostrSecretField() {
    const storedSecret = await getNostrSyncSecret();
    nostrSecretStored = Boolean(storedSecret);
    if (nostrSyncSecretInput) {
      nostrSyncSecretInput.value = storedSecret || "";
      nostrSyncSecretInput.type = nostrSyncShowSecret?.checked ? "text" : "password";
    }
  }

  async function loadNostrSyncSettings() {
    if (!nostrSyncEnabled) return;
    const [config, status] = await Promise.all([
      getNostrSyncConfig(),
      getNostrSyncStatus(),
    ]);
    nostrConfig = config;
    nostrStatus = status;
    if (nostrSyncRelays) {
      nostrSyncRelays.value = (config.relays || []).join("\n");
    }
    await refreshNostrSecretField();
    refreshNostrControls();
    renderNostrStatusText();
  }

  async function saveNostrConfigPatch(patch, successMessage) {
    try {
      nostrConfig = await updateNostrSyncConfig(patch);
      if (nostrSyncRelays) {
        nostrSyncRelays.value = (nostrConfig.relays || []).join("\n");
      }
      refreshNostrControls();
      renderNostrStatusText();
      if (successMessage) {
        showNostrFeedback(successMessage);
      }
    } catch (error) {
      refreshNostrControls();
      renderNostrStatusText();
      showNostrFeedback("Failed to save Nostr sync settings.");
    }
  }

  async function loadSettings() {
    const settings = await getSettings();
    setSiteRegistry(settings.livestreamSites || []);
    if (viewMetricSelect) {
      viewMetricSelect.value = settings.viewMetric || "focus";
    }
    if (livestreamSitesList) {
      renderLivestreamSiteRows(settings.livestreamSites || []);
    }
    try {
      await loadNostrSyncSettings();
    } catch (error) {
      showNostrFeedback("Could not load Nostr sync settings.");
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
      profiles.map((profile) => sanitizeProfile(profile, {
        sites: getSiteRegistry(),
        allowUnknownSites: true,
      })),
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
      .map((profile) => sanitizeProfile(profile, {
        sites: getSiteRegistry(),
        allowUnknownSites: true,
      }))
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
      element: nostrSyncEnabled,
      event: "change",
      handler: async () => {
        await saveNostrConfigPatch(
          { enabled: Boolean(nostrSyncEnabled?.checked) },
          "Nostr sync preference saved.",
        );
      },
    },
    {
      element: nostrSyncSaveConfigButton,
      event: "click",
      handler: async () => {
        const relays = parseRelayLines(nostrSyncRelays?.value || "");
        await saveNostrConfigPatch(
          { relays },
          `Saved ${relays.length} relay${relays.length === 1 ? "" : "s"}.`,
        );
      },
    },
    {
      element: nostrSyncShowSecret,
      event: "change",
      handler: () => {
        if (!nostrSyncSecretInput) return;
        nostrSyncSecretInput.type = nostrSyncShowSecret?.checked ? "text" : "password";
      },
    },
    {
      element: nostrSyncSaveSecretButton,
      event: "click",
      handler: async () => {
        const secret = (nostrSyncSecretInput?.value || "").trim();
        if (!secret) {
          showNostrFeedback("Enter an nsec or hex private key first.");
          return;
        }
        try {
          await setNostrSyncSecret(secret);
          await refreshNostrSecretField();
          refreshNostrControls();
          renderNostrStatusText();
          showNostrFeedback("Private key saved locally.");
        } catch (error) {
          showNostrFeedback("Could not save private key. Check its format.");
        }
      },
    },
    {
      element: nostrSyncGenerateSecretButton,
      event: "click",
      handler: async () => {
        if (nostrSecretStored) {
          const confirmed = window.confirm(
            "A local Nostr key is already stored. Generate and replace it? This cannot be undone.",
          );
          if (!confirmed) return;
        }
        try {
          await generateNostrSyncSecret();
          await refreshNostrSecretField();
          refreshNostrControls();
          renderNostrStatusText();
          showNostrFeedback("New private key generated and stored locally (masked in field).");
        } catch (error) {
          showNostrFeedback("Could not generate a new private key.");
        }
      },
    },
    {
      element: nostrSyncClearSecretButton,
      event: "click",
      handler: async () => {
        try {
          await clearNostrSyncSecret();
          await refreshNostrSecretField();
          refreshNostrControls();
          renderNostrStatusText();
          showNostrFeedback("Stored private key cleared.");
        } catch (error) {
          showNostrFeedback("Failed to clear private key.");
        }
      },
    },
    {
      element: nostrSyncNowButton,
      event: "click",
      handler: async () => {
        if (nostrSyncInProgress) return;
        nostrSyncInProgress = true;
        refreshNostrControls();
        try {
          const result = await syncNostrNow();
          nostrStatus = result?.status || (await getNostrSyncStatus());
          await refreshNostrSecretField();
          renderNostrStatusText();
          if (result?.ok) {
            showNostrFeedback(`Sync completed. Pulled ${result.pulledCount || 0}, pushed ${result.pushedCount || 0}.`);
          } else {
            showNostrFeedback(result?.error || "Sync finished with issues.");
          }
        } catch (error) {
          nostrStatus = await getNostrSyncStatus();
          renderNostrStatusText();
          showNostrFeedback("Sync failed. Local data is unchanged.");
        } finally {
          nostrSyncInProgress = false;
          refreshNostrControls();
        }
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

  refreshNostrControls();
  renderNostrStatusText();
  loadSettings();
  refreshMeta();
}
