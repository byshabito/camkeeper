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

import { initSettingsPanel } from "../components/settingsPanel.js";

export function initOptionsController() {
  const elements = {
    exportButton: document.getElementById("export-button"),
    importButton: document.getElementById("import-button"),
    importInput: document.getElementById("import-input"),
    viewMetricSelect: document.getElementById("view-metric"),
    livestreamSitesList: document.getElementById("livestream-sites-list"),
    addLivestreamSiteButton: document.getElementById("add-livestream-site"),
    settingsFeedback: document.getElementById("settings-feedback"),
    backupFeedback: document.getElementById("backup-feedback"),
    nostrSyncFeedback: document.getElementById("nostr-sync-feedback"),
    nostrSyncEnabled: document.getElementById("nostr-sync-enabled"),
    nostrSyncRelays: document.getElementById("nostr-sync-relays"),
    nostrSyncSaveConfigButton: document.getElementById("nostr-sync-save-config"),
    nostrSyncSecretInput: document.getElementById("nostr-sync-secret"),
    nostrSyncShowSecret: document.getElementById("nostr-sync-show-secret"),
    nostrSyncPassphraseInput: document.getElementById("nostr-sync-passphrase"),
    nostrSyncPassphraseConfirmInput: document.getElementById("nostr-sync-passphrase-confirm"),
    nostrSyncShowPassphrase: document.getElementById("nostr-sync-show-passphrase"),
    nostrSyncSaveSecretButton: document.getElementById("nostr-sync-save-secret"),
    nostrSyncGenerateSecretButton: document.getElementById("nostr-sync-generate-secret"),
    nostrSyncClearSecretButton: document.getElementById("nostr-sync-clear-secret"),
    nostrSyncSecretState: document.getElementById("nostr-sync-secret-state"),
    nostrSyncNowButton: document.getElementById("nostr-sync-now"),
    nostrSyncStatus: document.getElementById("nostr-sync-status"),
    nostrSyncInlineMessage: document.getElementById("nostr-sync-inline-message"),
    nostrSyncReady: document.getElementById("nostr-sync-ready"),
    nostrSyncTitleState: document.getElementById("nostr-sync-title-state"),
    bitcoinDonateButton: document.getElementById("bitcoin-donate-button"),
    bitcoinModal: document.getElementById("bitcoin-modal"),
    bitcoinModalCloseBottom: document.getElementById("bitcoin-modal-close-bottom"),
    bitcoinToast: document.getElementById("bitcoin-toast"),
    metaVersion: document.getElementById("meta-version"),
    metaDocs: document.getElementById("meta-docs"),
    metaChangelog: document.getElementById("meta-changelog"),
    metaPrivacy: document.getElementById("meta-privacy"),
    metaSupport: document.getElementById("meta-support"),
    metaSource: document.getElementById("meta-source"),
    metaLicense: document.getElementById("meta-license"),
  };

  initSettingsPanel({ elements, allowFileImport: true });
}
