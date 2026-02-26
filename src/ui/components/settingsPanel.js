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
import { analyzeNostrRelays } from "../../domain/nostrSync.js";
import {
  getProfiles,
  saveProfiles,
  getSettings,
  updateSettings,
  getNostrSyncConfig,
  updateNostrSyncConfig,
  getNostrSyncSecret,
  hasNostrSyncSecret,
  setNostrSyncSecret,
  generateNostrSyncSecret,
  clearNostrSyncSecret,
  getNostrSyncStatus,
  syncNostrNow,
} from "../../domain/appService.js";
import { sanitizeProfile } from "../../domain/sanitizers.js";

const DOCS_URL = "https://shabito.net/camkeeper/";
const CHANGELOG_URL = "https://shabito.net/camkeeper/changelog/";
const PRIVACY_URL = "https://shabito.net/camkeeper/privacy/";
const SUPPORT_URL = "https://shabito.net/camkeeper/support/";
const SOURCE_URL = "https://github.com/byshabito/camkeeper";
const LICENSE_URL = "https://www.gnu.org/licenses/gpl-3.0.en.html";

const SYNC_MODE_PULL = "pull";
const SYNC_MODE_PUSH = "push";

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
    nostrSyncPullNowButton,
    nostrSyncPushNowButton,
    nostrSyncStatus,
    nostrSyncInlineMessage,
    nostrSyncReady,
    nostrSyncTitleState,
    bitcoinDonateButton,
    bitcoinModal,
    bitcoinModalCloseBottom,
    bitcoinToast,
    metaVersion,
    metaDocs,
    metaChangelog,
    metaPrivacy,
    metaSupport,
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
  let nostrSyncActiveMode = "";
  let lastPublishFailures = [];

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

  function setNostrInlineMessage(message, tone = "") {
    if (!nostrSyncInlineMessage) return;
    nostrSyncInlineMessage.textContent = message || "";
    nostrSyncInlineMessage.classList.remove("is-success", "is-warning", "is-error");
    if (tone === "success" || tone === "warning" || tone === "error") {
      nostrSyncInlineMessage.classList.add(`is-${tone}`);
    }
  }

  function getNostrReadiness() {
    const relayCount = Array.isArray(nostrConfig?.relays) ? nostrConfig.relays.length : 0;
    const enabled = Boolean(nostrConfig?.enabled);
    const keyStored = Boolean(nostrSecretStored);
    const ready = enabled && relayCount > 0 && keyStored;
    let hint = "Sync setup incomplete.";
    if (ready) {
      hint = "Ready to sync.";
    } else if (!enabled) {
      hint = "Turn on sync when setup is complete.";
    } else if (!relayCount) {
      hint = "Add at least one valid relay.";
    } else if (!keyStored) {
      hint = "Save a private key to continue.";
    }
    return {
      ready,
      relayCount,
      enabled,
      keyStored,
      hint,
    };
  }

  function formatSyncResult(pulledCount, pushedCount) {
    return `Pulled ${pulledCount || 0}, pushed ${pushedCount || 0}`;
  }

  function formatPublishFailures(value, maxItems = 3) {
    const failures = Array.isArray(value) ? value : [];
    if (!failures.length) return "";
    const preview = failures.slice(0, maxItems).map((item) => {
      const type = String(item?.type || "event");
      const profileId = String(item?.profileId || "");
      const suffix = profileId ? ` ${profileId.slice(0, 8)}...` : "";
      return `${type}${suffix}`;
    });
    const overflow = failures.length - preview.length;
    return overflow > 0 ? `${preview.join(", ")} (+${overflow} more)` : preview.join(", ");
  }

  function describeRelaySaveResult(analysis) {
    if (!analysis.inputCount) {
      return {
        message: "Relay list cleared.",
        tone: "success",
      };
    }
    if (!analysis.acceptedCount) {
      return {
        message: "No valid relays found. Use one relay per line with wss://",
        tone: "warning",
      };
    }
    const skipped = [];
    if (analysis.invalidCount) {
      skipped.push(`${analysis.invalidCount} invalid`);
    }
    if (analysis.duplicateCount) {
      skipped.push(`${analysis.duplicateCount} duplicate`);
    }
    if (analysis.truncatedCount) {
      skipped.push(`${analysis.truncatedCount} over limit`);
    }
    const base = `Saved ${analysis.acceptedCount} relay${analysis.acceptedCount === 1 ? "" : "s"}.`;
    return {
      message: skipped.length ? `${base} Skipped ${skipped.join(" and ")}.` : base,
      tone: skipped.length ? "warning" : "success",
    };
  }

  function refreshNostrControls() {
    const readiness = getNostrReadiness();
    if (nostrSyncEnabled) {
      nostrSyncEnabled.checked = readiness.enabled;
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
    const pullActive = nostrSyncInProgress && nostrSyncActiveMode === SYNC_MODE_PULL;
    const pushActive = nostrSyncInProgress && nostrSyncActiveMode === SYNC_MODE_PUSH;
    if (nostrSyncPullNowButton) {
      nostrSyncPullNowButton.disabled = nostrSyncInProgress || !readiness.ready;
      nostrSyncPullNowButton.textContent = pullActive ? "Pulling..." : "Pull now";
    }
    if (nostrSyncPushNowButton) {
      nostrSyncPushNowButton.disabled = nostrSyncInProgress || !readiness.ready;
      nostrSyncPushNowButton.textContent = pushActive ? "Pushing..." : "Push now";
    }
  }

  function renderNostrStatusText() {
    const readiness = getNostrReadiness();
    if (nostrSyncSecretState) {
      nostrSyncSecretState.textContent = nostrSecretStored
        ? "Private key is stored in browser extension storage on this device."
        : "No private key stored.";
    }
    if (nostrSyncReady) {
      nostrSyncReady.textContent = readiness.hint;
      nostrSyncReady.classList.toggle("nostr-ready-ok", readiness.ready);
      nostrSyncReady.classList.toggle("nostr-ready-warning", !readiness.ready);
    }
    if (nostrSyncTitleState) {
      nostrSyncTitleState.textContent = readiness.enabled ? "" : "(Disabled)";
      nostrSyncTitleState.classList.toggle("is-enabled", readiness.enabled);
      nostrSyncTitleState.classList.toggle("is-disabled", !readiness.enabled);
    }

    if (nostrSyncStatus) {
      if (!nostrStatus) {
        nostrSyncStatus.textContent = "No sync attempts yet.";
        return;
      }
      const lines = [
        `${readiness.enabled ? "Enabled" : "Disabled"} | ${readiness.relayCount} relay${readiness.relayCount === 1 ? "" : "s"} | Key ${readiness.keyStored ? "saved" : "missing"} | ${formatSyncResult(nostrStatus.pulledCount, nostrStatus.pushedCount)} | Last attempt: ${formatStatusTimestamp(nostrStatus.lastAttemptAt)}`,
      ];
      if (Number.isFinite(nostrStatus.lastSuccessAt)) {
        lines.push(`Last success: ${formatStatusTimestamp(nostrStatus.lastSuccessAt)}`);
      }
      const failureText = formatPublishFailures(lastPublishFailures);
      if (failureText) {
        lines.push(`Failed events: ${failureText}`);
      }
      if (nostrStatus.lastError) {
        lines.push(`Last error: ${nostrStatus.lastError}`);
      }
      nostrSyncStatus.textContent = lines.join("\n");
    }
  }

  async function refreshNostrSecretField() {
    const storedSecret = await getNostrSyncSecret();
    nostrSecretStored = Boolean(storedSecret) || await hasNostrSyncSecret();
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
    lastPublishFailures = [];
    if (nostrSyncRelays) {
      nostrSyncRelays.value = (config.relays || []).join("\n");
    }
    await refreshNostrSecretField();
    refreshNostrControls();
    renderNostrStatusText();
    setNostrInlineMessage("");
  }

  async function saveNostrConfigPatch(patch, successMessage, { inlineTone = "" } = {}) {
    try {
      nostrConfig = await updateNostrSyncConfig(patch);
      if (nostrSyncRelays) {
        nostrSyncRelays.value = (nostrConfig.relays || []).join("\n");
      }
      refreshNostrControls();
      renderNostrStatusText();
      if (successMessage) {
        showNostrFeedback(successMessage);
        setNostrInlineMessage(successMessage, inlineTone);
      }
      return true;
    } catch (error) {
      refreshNostrControls();
      renderNostrStatusText();
      showNostrFeedback("Failed to save Nostr sync settings.");
      setNostrInlineMessage("Failed to save Nostr sync settings.", "error");
      return false;
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
    if (metaDocs) {
      metaDocs.textContent = "Docs";
      metaDocs.href = DOCS_URL;
    }
    if (metaChangelog) {
      metaChangelog.textContent = "Changelog";
      metaChangelog.href = CHANGELOG_URL;
    }
    if (metaPrivacy) {
      metaPrivacy.textContent = "Privacy";
      metaPrivacy.href = PRIVACY_URL;
    }
    if (metaSupport) {
      metaSupport.textContent = "Support";
      metaSupport.href = SUPPORT_URL;
    }
    if (metaSource) {
      metaSource.textContent = "Open-sourced";
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

  async function handleManualNostrSync(mode) {
    if (nostrSyncInProgress) return;
    const readiness = getNostrReadiness();
    if (!readiness.ready) {
      const message = "Sync requires enabled toggle, at least one relay, and a saved private key.";
      showNostrFeedback(message);
      setNostrInlineMessage(message, "warning");
      return;
    }

    nostrSyncInProgress = true;
    nostrSyncActiveMode = mode;
    refreshNostrControls();
    try {
      const result = await syncNostrNow({ mode });
      nostrStatus = result?.status || (await getNostrSyncStatus());
      lastPublishFailures = Array.isArray(result?.publishFailures) ? result.publishFailures : [];
      await refreshNostrSecretField();
      renderNostrStatusText();

      if (result?.ok) {
        if (mode === SYNC_MODE_PULL) {
          const message = `Pull completed. Pulled ${result.pulledCount || 0}.`;
          showNostrFeedback(message);
          setNostrInlineMessage(message, "success");
        } else {
          const message = `Push completed. Pushed ${result.pushedCount || 0}.`;
          showNostrFeedback(message);
          setNostrInlineMessage(message, "success");
        }
      } else {
        if (mode === SYNC_MODE_PUSH) {
          const failureCount = lastPublishFailures.length;
          const issueMessage = failureCount
            ? `Push completed with issues. ${failureCount} event${failureCount === 1 ? "" : "s"} failed to publish.`
            : (result?.error || "Push finished with issues.");
          showNostrFeedback(issueMessage);
          setNostrInlineMessage(issueMessage, "warning");
        } else {
          const issueMessage = result?.error || "Pull finished with issues.";
          showNostrFeedback(issueMessage);
          setNostrInlineMessage(issueMessage, "warning");
        }
      }
    } catch (error) {
      nostrStatus = await getNostrSyncStatus();
      lastPublishFailures = [];
      renderNostrStatusText();
      if (mode === SYNC_MODE_PULL) {
        showNostrFeedback("Pull failed. Local data is unchanged.");
        setNostrInlineMessage("Pull failed. Local data is unchanged.", "error");
      } else {
        showNostrFeedback("Push failed. Local data is unchanged.");
        setNostrInlineMessage("Push failed. Local data is unchanged.", "error");
      }
    } finally {
      nostrSyncInProgress = false;
      nostrSyncActiveMode = "";
      refreshNostrControls();
    }
  }

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
          { inlineTone: "success" },
        );
      },
    },
    {
      element: nostrSyncSaveConfigButton,
      event: "click",
      handler: async () => {
        const relayLines = parseRelayLines(nostrSyncRelays?.value || "");
        const relayAnalysis = analyzeNostrRelays(relayLines);
        const relayResult = describeRelaySaveResult(relayAnalysis);
        await saveNostrConfigPatch(
          { relays: relayAnalysis.relays },
          relayResult.message,
          { inlineTone: relayResult.tone },
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
          setNostrInlineMessage("Enter an nsec or hex private key first.", "warning");
          return;
        }
        try {
          await setNostrSyncSecret(secret);
          await refreshNostrSecretField();
          refreshNostrControls();
          renderNostrStatusText();
          showNostrFeedback("Private key saved locally.");
          setNostrInlineMessage("Private key saved locally.", "success");
        } catch (error) {
          const message = error?.message || "Could not save private key.";
          showNostrFeedback(message);
          setNostrInlineMessage(message, "error");
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
          showNostrFeedback("New private key generated and saved locally.");
          setNostrInlineMessage("New private key generated and saved locally.", "success");
        } catch (error) {
          const message = error?.message || "Could not generate a new private key.";
          showNostrFeedback(message);
          setNostrInlineMessage(message, "error");
        }
      },
    },
    {
      element: nostrSyncClearSecretButton,
      event: "click",
      handler: async () => {
        if (nostrSecretStored) {
          const confirmed = window.confirm(
            "Clear the stored private key on this device? Sync will stop until a key is saved again.",
          );
          if (!confirmed) return;
        }
        try {
          await clearNostrSyncSecret();
          await refreshNostrSecretField();
          refreshNostrControls();
          renderNostrStatusText();
          showNostrFeedback("Stored private key cleared.");
          setNostrInlineMessage("Stored private key cleared.", "warning");
        } catch (error) {
          showNostrFeedback("Failed to clear private key.");
          setNostrInlineMessage("Failed to clear private key.", "error");
        }
      },
    },
    {
      element: nostrSyncPullNowButton,
      event: "click",
      handler: () => handleManualNostrSync(SYNC_MODE_PULL),
    },
    {
      element: nostrSyncPushNowButton,
      event: "click",
      handler: () => handleManualNostrSync(SYNC_MODE_PUSH),
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
