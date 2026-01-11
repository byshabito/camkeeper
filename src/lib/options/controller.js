import { initSettingsPanel } from "../popup/settingsPanel.js";

export function initOptionsController() {
  const elements = {
    exportButton: document.getElementById("export-button"),
    importInput: document.getElementById("import-input"),
    debugLogsInput: document.getElementById("debug-logs"),
    visitSaveButton: document.getElementById("visit-save"),
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
