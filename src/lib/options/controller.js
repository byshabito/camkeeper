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

import { initSettingsPanel } from "../popup/settingsPanel.js";

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
    bitcoinDonateButton: document.getElementById("bitcoin-donate-button"),
    bitcoinModal: document.getElementById("bitcoin-modal"),
    bitcoinModalCloseBottom: document.getElementById("bitcoin-modal-close-bottom"),
    bitcoinToast: document.getElementById("bitcoin-toast"),
    metaVersion: document.getElementById("meta-version"),
    metaRelease: document.getElementById("meta-release"),
    metaDeveloper: document.getElementById("meta-developer"),
    metaSource: document.getElementById("meta-source"),
    metaLicense: document.getElementById("meta-license"),
  };

  initSettingsPanel({ elements, allowFileImport: true });
}
