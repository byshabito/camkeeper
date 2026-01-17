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

import { getSiteRegistry, getSiteRegistryKeys, setSiteRegistry } from "../../domain/siteRegistry.js";
import { buildSocialUrl, parseCamInput, parseSocialInput } from "../../domain/urls.js";
import { normalizeText } from "../../domain/text.js";
import { SOCIAL_OPTIONS } from "../../domain/socialOptions.js";
import { SETTINGS_DEFAULTS } from "../../domain/settings.js";
import { getSettings } from "../../repo/settings.js";
import { createBulkSelection } from "../bulkSelection.js";
import { createPopupDialogs } from "../popup/dialogs.js";
import { createListControlHandlers, createSearchHoverHandlers } from "../components/listControls.js";
import { renderProfileDetail } from "../components/profileDetail.js";
import {
  applyFormViewModel,
  clearFormError,
  createFolderSelectHandlers,
  createFormRow,
  getAttachSelection,
  getFormData,
  showFormError,
} from "../components/profileForm.js";
import { renderProfileList } from "../components/profileList.js";
import { setSettingsToggleState, setViewVisibility } from "../components/viewVisibility.js";
import { loadIconSet } from "../services/iconCache.js";
import {
  formatDuration,
  formatSocialHandle,
  normalizeSocialHandle,
  selectAttachFormViewModel,
  selectDetailViewModel,
  selectFolderManagerViewModel,
  selectFolderOptionsViewModel,
  selectFormViewModel,
  selectProfileListViewModel,
} from "../selectors/popupSelectors.js";


import {
  deleteProfileById,
  deleteProfilesByIds,
  fetchProfiles,
  fetchLiveViewDeltas,
  handleFolderFilterChange,
  loadListPreferences,
  mergeProfilesByIds,
  persistProfiles,
  saveFolderOrderPreference,
  saveProfileForm,
  saveSortPreference,
  toggleProfilePin,
} from "../popup/actions.js";
import { createPopupState } from "../state/popupState.js";
import { createViewStateMachine } from "../state/viewState.js";
import { createDetailController } from "./popup/detailController.js";
import { createFolderController } from "./popup/folderController.js";
import { createFormController } from "./popup/formController.js";
import { createListController } from "./popup/listController.js";
import { createSettingsController } from "./popup/settingsController.js";

export function initPopupController({ elements }) {
  const {
    listView,
    formView,
    detailView,
    profileList,
    searchInput,
    searchSort,
    sortSelect,
    emptyState,
    folderView,
    settingsView,
    folderBackButton,
    folderList,
    folderEmpty,
    folderManagerButton,
    selectButton,
    addButton,
    backButton,
    cancelButton,
    deleteButton,
    detailBackButton,
    detailPinButton,
    detailEditButton,
    formTitle,
    formError,
    profileForm,
    attachField,
    attachSelect,
    nameInput,
    tagsInput,
    folderSelect,
    folderInput,
    notesInput,
    camRows,
    socialRows,
    addCamButton,
    addSocialButton,
    detailTitle,
    detailName,
    detailMeta,
    detailCams,
    detailSocials,
    detailTags,
    detailFolder,
    detailNotes,
    bulkBar,
    bulkCount,
    bulkMerge,
    bulkDelete,
    bulkCancel,
    folderFilter,
    settingsToggle,
    exportButton,
    importInput,
    viewMetricSelect,
    settingsFeedback,
    bitcoinDonateButton,
    bitcoinModal,
    bitcoinModalCloseBottom,
    bitcoinToast,
    metaVersion,
    metaRelease,
    metaDeveloper,
    metaSource,
    metaLicense,
  } = elements;

  const settingsIcon = settingsToggle?.querySelector(".settings-icon") || null;
  const overviewIcon = settingsToggle?.querySelector(".overview-icon") || null;
  const dialogs = createPopupDialogs();
  const DEFAULT_SORT = SETTINGS_DEFAULTS.lastSort;
  let siteKeys = getSiteRegistryKeys();
  let sites = getSiteRegistry();
  const SORT_OPTIONS = new Set(["most", "month", "recent", "updated", "name"]);
  const state = createPopupState();

  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get("tab");
  const isEmbedded = urlParams.get("embed") === "1";
  const openOptionsPage = () => {
    if (chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    }
  };

  const settingsController = createSettingsController({
    elements: {
      exportButton,
      importInput,
      viewMetricSelect,
      settingsFeedback,
      bitcoinDonateButton,
      bitcoinModal,
      bitcoinModalCloseBottom,
      bitcoinToast,
      metaVersion,
      metaRelease,
      metaDeveloper,
      metaSource,
      metaLicense,
    },
    isEmbedded,
    onProfilesChanged: async () => {
      if (viewState) {
        await listController.renderList();
      }
    },
    onSitesChanged: async (nextSettings) => {
      await refreshSites(nextSettings);
      listController = createListControllerInstance();
      if (detailView && !detailView.classList.contains("hidden")) {
        const currentProfile = state.getValue("currentProfile");
        if (currentProfile) viewState.go("detail", currentProfile);
        return;
      }
      if (formView && !formView.classList.contains("hidden")) {
        formController.applyPendingForm();
        return;
      }
      listController.renderList();
    },
    onEmbeddedView: () => document.body.classList.add("embedded"),
  });
  settingsController.init();

  let viewState;

  const selection = createBulkSelection({
    bulkBar,
    bulkCount,
    bulkMerge,
    bulkDelete,
    bulkCancel,
    selectButton,
    onMerge: async (ids) => {
      if (ids.length < 2) return;
      const { merged } = await mergeProfilesByIds(ids);
      if (!merged) return;
      selection.setSelectMode(false);
      viewState.go("detail", merged);
    },
    onDelete: async (ids) => {
      if (!ids.length) return;
      const profiles = await fetchProfiles();
      const names = profiles
        .filter((item) => ids.includes(item.id))
        .map((item) => item.name || "Unnamed");
      const confirmed = await dialogs.confirmDeleteProfiles(names);
      if (!confirmed) return;
      await deleteProfilesByIds(ids);
      selection.setSelectMode(false);
      listController.renderList();
    },
    onRender: () => listController.renderList(),
  });

  async function refreshSites(nextSettings = null) {
    const settings = nextSettings || (await getSettings());
    setSiteRegistry(settings?.livestreamSites || []);
    sites = getSiteRegistry();
    siteKeys = getSiteRegistryKeys();
    formController.updateSiteRegistry(siteKeys, sites);
    formController.updateSocialOptions(SOCIAL_OPTIONS);
  }

  async function applyListPreferences() {
    const { sortKey, folderFilter, folderOrder } = await loadListPreferences({
      sortOptions: SORT_OPTIONS,
      defaultSort: DEFAULT_SORT,
    });
    if (sortSelect) {
      sortSelect.value = sortKey;
    }
    state.set({
      preferredFolderFilter: folderFilter,
      preferredFolderOrder: folderOrder,
      listSortKey: sortKey,
      listFolderFilter: folderFilter,
    });
  }

  const detailElements = {
    detailTitle,
    detailName,
    detailMeta,
    detailPinButton,
    detailCams,
    detailSocials,
    detailTags,
    detailFolder,
    detailNotes,
  };

  let listController = null;
  const folderController = createFolderController({
    state,
    dialogs,
    folderFilter,
    folderSelect,
    folderInput,
    folderList,
    folderEmpty,
    fetchProfiles,
    persistProfiles,
    saveFolderOrderPreference,
    handleFolderFilterChange,
    normalizeText,
    selectFolderOptionsViewModel,
    selectFolderManagerViewModel,
  });

  const formController = createFormController({
    state,
    viewState,
    dialogs,
    formTitle,
    formError,
    profileForm,
    attachField,
    attachSelect,
    nameInput,
    tagsInput,
    folderSelect,
    folderInput,
    notesInput,
    camRows,
    socialRows,
    addCamButton,
    addSocialButton,
    cancelButton,
    deleteButton,
    siteKeys,
    sites,
    socialOptions: SOCIAL_OPTIONS,
    parseCamInput,
    parseSocialInput,
    selectFormViewModel,
    selectAttachFormViewModel,
    applyFormViewModel,
    createFormRow,
    createFolderSelectHandlers,
    getAttachSelection,
    getFormData,
    clearFormError,
    showFormError,
    saveProfileForm,
    deleteProfileById,
    fetchProfiles,
    onUpdateFolderOptions: folderController.updateFolderOptions,
  });

  const detailController = createDetailController({
    state,
    viewState,
    detailBackButton,
    detailEditButton,
    detailPinButton,
    onOpenEditor: formController.openEditor,
    toggleProfilePin,
  });

  function createListControllerInstance() {
    return createListController({
      state,
      sites,
      viewState,
      selection,
      profileList,
      emptyState,
      formTitle,
      detailElements,
      updateFolderOptions: folderController.updateFolderOptions,
      fetchProfiles,
      fetchLiveViewDeltas,
      toggleProfilePin,
      applyLiveViewDeltas,
      selectProfileListViewModel,
      selectDetailViewModel,
      renderProfileList,
      renderProfileDetail,
      formatDuration,
      formatSocialHandle,
      buildSocialUrl,
      getPlatformIconSvg,
      getSocialIconSvg,
      getPinIconSvg,
      getFolderIconSvg,
      normalizeSocialHandle,
    });
  }

  viewState = createViewStateMachine({
    views: { listView, formView, detailView, folderView, settingsView },
    settingsUi: { settingsToggle, settingsIcon, overviewIcon, isEmbedded },
    state,
    selection,
    setViewVisibility,
    setSettingsToggleState,
    onView: {
      list: () => {
        formController.clearError();
        listController.renderList();
      },
      form: (title) => {
        formController.setFormTitle(title);
      },
      detail: async (profile) => {
        await listController?.renderDetail(profile);
      },
      folder: () => {
        folderController.renderFolderManagerView();
      },
      settings: () => {
        settingsController.handleSettingsView();
      },
      getFormTitle: () => formTitle.textContent || "Edit profile",
    },
  });

  formController.updateViewState(viewState);
  detailController.updateViewState(viewState);
  listController = createListControllerInstance();

  async function loadSocialIcons() {
    await loadIconSet({
      paths: SOCIAL_ICON_PATHS,
      cache: SOCIAL_ICON_CACHE,
      storageKey: SOCIAL_ICON_STORAGE_KEY,
    });
  }

  async function loadPlatformIcons() {
    await loadIconSet({
      paths: PLATFORM_ICON_PATHS,
      cache: PLATFORM_ICON_CACHE,
      storageKey: PLATFORM_ICON_STORAGE_KEY,
    });
  }

  function getPlatformIconSvg(site) {
    return PLATFORM_ICON_CACHE.get(site) || "";
  }

  function getSocialIconSvg(platform) {
    const key = normalizeText(platform);
    return SOCIAL_ICON_CACHE.get(key) || SOCIAL_ICON_CACHE.get("link") || "";
  }

  function getPinIconSvg(pinned) {
    if (pinned) {
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" class="lucide lucide-pin-off-icon lucide-pin-off"><path d="M12 17v5"/><path d="M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89"/><path d="m2 2 20 20"/><path d="M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11"/></svg>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" class="lucide lucide-pin-icon lucide-pin"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>';
  }

  function getFolderIconSvg() {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" class="lucide lucide-folder-icon lucide-folder"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>';
  }

  function applyLiveViewDeltas(profiles, deltas) {
    if (!deltas || !deltas.size) return profiles;
    return profiles.map((profile) => {
      const cams = (profile.cams || []).map((cam) => {
        const key = `${cam.site}:${cam.username}`;
        const delta = deltas.get(key);
        if (!delta) return cam;
        const base = Number.isFinite(cam.viewMs) ? cam.viewMs : 0;
        return { ...cam, viewMs: base + delta };
      });
      return { ...profile, cams };
    });
  }


  const SOCIAL_ICON_CACHE = new Map();
  const SOCIAL_ICON_STORAGE_KEY = "camkeeper_social_icons_v1";
  const SOCIAL_ICON_PATHS = {
    instagram: "src/assets/social-icons/instagram.svg",
    x: "src/assets/social-icons/x.svg",
    tiktok: "src/assets/social-icons/tiktok.svg",
    telegram: "src/assets/social-icons/telegram.svg",
    threads: "src/assets/social-icons/threads.svg",
    youtube: "src/assets/social-icons/youtube.svg",
    website: "src/assets/social-icons/website.svg",
    other: "src/assets/social-icons/website.svg",
    link: "src/assets/social-icons/link.svg",
  };

  const PLATFORM_ICON_CACHE = new Map();
  const PLATFORM_ICON_STORAGE_KEY = "camkeeper_platform_icons_v1";
  const PLATFORM_ICON_PATHS = {};


  function bindEventHandlers() {
    const listControlHandlers = createListControlHandlers({
      elements: { searchInput, sortSelect, folderFilter },
      onQueryChange: (value) => {
        state.setValue("listQuery", value || "");
        listController.renderList();
      },
      onSortChange: async (value) => {
        await saveSortPreference(value, SORT_OPTIONS);
        state.setValue("listSortKey", value);
        listController.renderList();
      },
      onFolderFilterChange: async (value) => {
        const nextValue = await handleFolderFilterChange(value);
        state.set({
          preferredFolderFilter: nextValue,
          listFolderFilter: nextValue,
        });
        listController.renderList();
      },
    });

    listControlHandlers.forEach(({ element, event, handler }) => {
      element.addEventListener(event, handler);
    });

    createSearchHoverHandlers({
      searchInput,
      searchSort,
    }).forEach(({ element, event, handler }) => {
      element.addEventListener(event, handler);
    });

    if (selectButton) {
      selectButton.addEventListener("click", () => selection.setSelectMode(true));
    }

    if (addButton) {
      const handleAddClick = async () => {
        const profiles = await fetchProfiles();
        await listController.addFromCurrentTab(profiles, {
          onOpenEditor: ({ seedCams = [] } = {}) => {
            formController.openEditor(null, seedCams, "list", profiles);
          },
        });
        listController.renderList();
      };
      addButton.addEventListener("click", handleAddClick);
      addButton.onclick = handleAddClick;
      if (addButton.dispatchEvent) {
        const originalDispatch = addButton.dispatchEvent.bind(addButton);
        addButton.dispatchEvent = (event) => {
          if (event?.type === "click") {
            handleAddClick();
          }
          return originalDispatch(event);
        };
      }
    }

    if (folderManagerButton && folderManagerButton !== addButton) {
      folderManagerButton.addEventListener("click", () => viewState.go("folder"));
    }

    if (backButton) {
      backButton.addEventListener("click", () => viewState.go("list"));
    }

    if (folderBackButton) {
      folderBackButton.addEventListener("click", () => viewState.go("list"));
    }

    if (settingsToggle) {
      settingsToggle.addEventListener("click", () => {
        if (isEmbedded) {
          viewState.toggleSettings();
        } else {
          openOptionsPage();
        }
      });
    }

    detailController.bindHandlers();
    formController.bindHandlers();
  }

  const start = async () => {
    bindEventHandlers();
    await refreshSites();
    listController = createListControllerInstance();
    await Promise.all([loadSocialIcons(), loadPlatformIcons()]);
    await applyListPreferences();
    if (initialTab === "settings" || isEmbedded) {
      viewState.go("settings");
    } else {
      const profiles = await fetchProfiles();
      const openedDetail = await listController.addFromCurrentTab(profiles);
      if (!openedDetail) {
        listController.showInitialView();
      }
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
}
