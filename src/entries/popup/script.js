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

import { initPopupController } from "../../lib/popup/controller.js";

const elements = {
  listView: document.getElementById("list-view"),
  formView: document.getElementById("form-view"),
  detailView: document.getElementById("detail-view"),
  profileList: document.getElementById("profile-list"),
  searchInput: document.getElementById("search-input"),
  searchSort: document.querySelector(".search-sort"),
  sortSelect: document.getElementById("sort-select"),
  emptyState: document.getElementById("empty-state"),
  folderView: document.getElementById("folder-view"),
  settingsView: document.getElementById("settings-view"),
  folderBackButton: document.getElementById("folder-back"),
  folderList: document.getElementById("folder-list"),
  folderEmpty: document.getElementById("folder-empty"),
  folderManagerButton: document.getElementById("folder-manager-button"),
  selectButton: document.getElementById("select-button"),
  addButton: document.getElementById("add-button"),
  backButton: document.getElementById("back-button"),
  cancelButton: document.getElementById("cancel-button"),
  deleteButton: document.getElementById("delete-button"),
  detailBackButton: document.getElementById("detail-back"),
  detailPinButton: document.getElementById("detail-pin"),
  detailEditButton: document.getElementById("detail-edit"),
  formTitle: document.getElementById("form-title"),
  formError: document.getElementById("form-error"),
  profileForm: document.getElementById("profile-form"),
  attachField: document.getElementById("attach-field"),
  attachSelect: document.getElementById("attach-select"),
  nameInput: document.getElementById("name-input"),
  tagsInput: document.getElementById("tags-input"),
  folderSelect: document.getElementById("folder-select"),
  folderInput: document.getElementById("folder-input"),
  notesInput: document.getElementById("notes-input"),
  camRows: document.getElementById("cam-rows"),
  socialRows: document.getElementById("social-rows"),
  addCamButton: document.getElementById("add-cam"),
  addSocialButton: document.getElementById("add-social"),
  detailTitle: document.getElementById("detail-title"),
  detailName: document.getElementById("detail-name"),
  detailMeta: document.getElementById("detail-meta"),
  detailCams: document.getElementById("detail-cams"),
  detailSocials: document.getElementById("detail-socials"),
  detailTags: document.getElementById("detail-tags"),
  detailFolder: document.getElementById("detail-folder"),
  detailNotes: document.getElementById("detail-notes"),
  bulkBar: document.getElementById("bulk-bar"),
  bulkCount: document.getElementById("bulk-count"),
  bulkMerge: document.getElementById("bulk-merge"),
  bulkDelete: document.getElementById("bulk-delete"),
  bulkCancel: document.getElementById("bulk-cancel"),
  folderFilter: document.getElementById("folder-filter"),
  settingsToggle: document.getElementById("settings-toggle"),
  exportButton: document.getElementById("export-button"),
  importInput: document.getElementById("import-input"),
  viewMetricSelect: document.getElementById("view-metric"),
  settingsFeedback: document.getElementById("settings-feedback"),
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

initPopupController({ elements });
