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

import { getSites, getSiteKeys, setSitesFromSettings } from "../domain/sites.js";
import { parseCamInput, parseSocialInput, parseSocialUrl, parseUrl, buildSocialUrl } from "../domain/urls.js";
import { SOCIAL_OPTIONS } from "../domain/socialOptions.js";
import { createBulkSelection } from "../bulkSelection.js";
import { createPopupDialogs } from "./dialogs.js";
import {
  formatDuration,
  formatSocialHandle,
  normalizeSocialHandle,
  selectDetailViewModel,
  selectFolderManagerViewModel,
  selectListControlsViewModel,
  selectProfileListViewModel,
  selectFormViewModel,
  selectAttachFormViewModel,
  selectFolderOptionsViewModel,
} from "./selectors.js";
import { findDuplicateProfile } from "../domain/profiles.js";
import { normalizeText } from "../domain/text.js";
import { SETTINGS_DEFAULTS } from "../domain/settings.js";
import { getSettings } from "../repo/settings.js";
import {
  deleteProfileById,
  deleteProfilesByIds,
  fetchProfiles,
  fetchLiveViewDeltas,
  loadListPreferences,
  mergeProfilesByIds,
  handleFolderFilterChange,
  persistProfiles,
  saveFolderOrderPreference,
  saveProfileForm,
  saveSortPreference,
  toggleProfilePin,
} from "./actions.js";
import {
  clearFormError,
  applyFormViewModel,
  createFormRow,
  createFolderSelectHandlers,
  createListControlHandlers,
  createSearchHoverHandlers,
  renderFolderManager,
  renderFolderFilter,
  renderFolderSelect,
  renderProfileDetail,
  renderProfileList,
  getFormData,
  getAttachSelection,
  setSettingsToggleState,
  setViewVisibility,
  showFormError,
} from "./effects.js";
import { createPopupState } from "./state.js";
import { createViewStateMachine } from "./viewState.js";
import { initSettingsPanel } from "./settingsPanel.js";

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
  let siteKeys = getSiteKeys();
  let sites = getSites();
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

  initSettingsPanel({
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
    allowFileImport: isEmbedded,
    onProfilesChanged: async () => {
      if (viewState) {
        await renderList();
      }
    },
    onSitesChanged: async (nextSettings) => {
      await refreshSites(nextSettings);
      if (detailView && !detailView.classList.contains("hidden")) {
        const currentProfile = state.getValue("currentProfile");
        if (currentProfile) viewState.go("detail", currentProfile);
        return;
      }
      if (formView && !formView.classList.contains("hidden")) {
        applyForm(
          state.getValue("currentProfile"),
          state.getValue("attachSeedCams"),
          state.getValue("attachProfiles"),
        );
        return;
      }
      renderList();
    },
  });

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
      renderList();
    },
    onRender: () => renderList(),
  });

  async function refreshSites(nextSettings = null) {
    const settings = nextSettings || (await getSettings());
    setSitesFromSettings(settings?.livestreamSites);
    sites = getSites();
    siteKeys = getSiteKeys();
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

  viewState = createViewStateMachine({
    views: { listView, formView, detailView, folderView, settingsView },
    settingsUi: { settingsToggle, settingsIcon, overviewIcon, isEmbedded },
    state,
    selection,
    setViewVisibility,
    setSettingsToggleState,
    onView: {
      list: () => {
        clearFormError(formError);
        renderList();
      },
      form: (title) => {
        formTitle.textContent = title;
        deleteButton.classList.toggle("hidden", !state.getValue("editingId"));
      },
      detail: async (profile) => {
        if (!profile) return;
        const liveDeltas = await fetchLiveViewDeltas();
        const [adjustedProfile] = applyLiveViewDeltas([profile], liveDeltas);
        state.setValue("currentProfile", adjustedProfile);
        const viewModel = selectDetailViewModel(adjustedProfile, {
          formatDuration,
          formatSocialHandle,
          buildSocialUrl,
          sites,
          getPlatformIconSvg,
          getSocialIconSvg,
        });
        renderProfileDetail({
          viewModel,
          elements: {
            detailTitle,
            detailName,
            detailMeta,
            detailPinButton,
            detailCams,
            detailSocials,
            detailTags,
            detailFolder,
            detailNotes,
          },
          getPinIconSvg,
          getFolderIconSvg,
        });
      },
      folder: () => {
        renderFolderManagerView();
      },
      settings: () => {
        if (isEmbedded) document.body.classList.add("embedded");
      },
      getFormTitle: () => formTitle.textContent || "Edit profile",
    },
  });

  async function loadSocialIcons() {
    const entries = Object.entries(SOCIAL_ICON_PATHS);
    await Promise.all(
      entries.map(async ([key, path]) => {
        try {
          const response = await fetch(chrome.runtime.getURL(path));
          if (!response.ok) return;
          const text = await response.text();
          SOCIAL_ICON_CACHE.set(key, text);
        } catch (error) {
          // Ignore icon loading errors and fall back to link icon.
        }
      }),
    );
  }

  async function loadPlatformIcons() {
    const entries = Object.entries(PLATFORM_ICON_PATHS);
    await Promise.all(
      entries.map(async ([key, path]) => {
        try {
          const response = await fetch(chrome.runtime.getURL(path));
          if (!response.ok) return;
          const text = await response.text();
          PLATFORM_ICON_CACHE.set(key, text);
        } catch (error) {
          // Ignore icon loading errors and fall back to text.
        }
      }),
    );
  }

  function getPlatformIconSvg(site) {
    return PLATFORM_ICON_CACHE.get(site) || "";
  }

  function getSocialIconSvg(platform) {
    const key = normalizeText(platform);
    return SOCIAL_ICON_CACHE.get(key) || SOCIAL_ICON_CACHE.get("link") || "";
  }

  const SOCIAL_ICON_CACHE = new Map();
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
  const PLATFORM_ICON_PATHS = {};

  function updateFolderOptions(profiles, currentFolder) {
    const preferredFolderOrder = state.getValue("preferredFolderOrder");
    const preferredFolderFilter = state.getValue("preferredFolderFilter");
    const listFolderFilter = state.getValue("listFolderFilter");
    const viewModel = selectFolderOptionsViewModel({
      profiles,
      preferredOrder: preferredFolderOrder,
      selectedFilter: listFolderFilter,
      preferredFilter: preferredFolderFilter,
      currentFolder,
    });
    renderFolderFilter({
      elements: { folderFilter },
      options: viewModel.filterOptions,
      value: viewModel.filterValue,
    });
    renderFolderSelect({
      elements: { folderSelect, folderInput },
      options: viewModel.selectOptions,
      value: viewModel.selectValue,
      showNewFolderInput: viewModel.showNewFolderInput,
      newFolderValue: viewModel.newFolderValue,
    });
    state.setValue("listFolderFilter", viewModel.filterValue);
    if (viewModel.shouldResetFilter) {
      state.setValue("preferredFolderFilter", "");
      handleFolderFilterChange("");
    }
  }

  async function renameFolder(folderName, nextName) {
    const trimmed = (nextName || "").trim();
    if (!trimmed) return;
    const currentKey = normalizeText(folderName);
    const nextKey = normalizeText(trimmed);
    const profiles = await fetchProfiles();
    const updated = profiles.map((profile) => {
      const folderKey = normalizeText(profile.folder);
      if (!folderKey) return profile;
      if (folderKey !== currentKey && folderKey !== nextKey) return profile;
      return {
        ...profile,
        folder: trimmed,
        updatedAt: Date.now(),
      };
    });
    await persistProfiles(updated);
    if (currentKey !== nextKey) {
      const currentOrder = state.getValue("preferredFolderOrder");
      const nextOrder = currentOrder.map((key) => (key === currentKey ? nextKey : key));
      const updatedOrder = Array.from(new Set(nextOrder));
      state.setValue("preferredFolderOrder", updatedOrder);
      await saveFolderOrderPreference(updatedOrder);
    }
    updateFolderOptions(updated, trimmed);
    renderFolderManagerView(updated);
  }

  async function deleteFolder(folderName) {
    const currentKey = normalizeText(folderName);
    const profiles = await fetchProfiles();
    const updated = profiles.map((profile) => {
      const folderKey = normalizeText(profile.folder);
      if (!folderKey || folderKey !== currentKey) return profile;
      return {
        ...profile,
        folder: "",
        updatedAt: Date.now(),
      };
    });
    await persistProfiles(updated);
    const currentOrder = state.getValue("preferredFolderOrder");
    const nextOrder = currentOrder.filter((key) => key !== currentKey);
    if (nextOrder.length !== currentOrder.length) {
      state.setValue("preferredFolderOrder", nextOrder);
      await saveFolderOrderPreference(nextOrder);
    }
    updateFolderOptions(updated);
    renderFolderManagerView(updated);
  }

  async function handleFolderReorder(sourceKey, targetKey) {
    if (!sourceKey || !targetKey || sourceKey === targetKey) return;
    const order = Array.from(folderList.querySelectorAll(".folder-row"))
      .map((row) => row.dataset.folderKey)
      .filter(Boolean);
    const sourceIndex = order.indexOf(sourceKey);
    const targetIndex = order.indexOf(targetKey);
    if (sourceIndex === -1 || targetIndex === -1) return;
    order.splice(sourceIndex, 1);
    order.splice(targetIndex, 0, sourceKey);
    state.setValue("preferredFolderOrder", order);
    await saveFolderOrderPreference(order);
    const profiles = await fetchProfiles();
    updateFolderOptions(profiles);
    renderFolderManagerView(profiles);
  }

  async function renderFolderManagerView(prefetchedProfiles = null) {
    if (!folderList) return;
    const profiles = prefetchedProfiles || (await fetchProfiles());
    const viewModel = selectFolderManagerViewModel(
      profiles,
      state.getValue("preferredFolderOrder"),
    );
    renderFolderManager({
      folders: viewModel.folders,
      elements: { folderList, folderEmpty },
      onRename: (folder, nextValue) => {
        if (normalizeText(nextValue) === normalizeText(folder.name)) {
          if (nextValue !== folder.name) renameFolder(folder.name, nextValue);
          return;
        }
        renameFolder(folder.name, nextValue);
      },
      onDelete: async (folder) => {
      const confirmed = await dialogs.confirmDeleteFolder(folder.name);
        if (!confirmed) return;
        deleteFolder(folder.name);
      },
      onReorder: handleFolderReorder,
    });
  }

  function applyForm(profile, seedCams, profiles, selectedAttachId = null) {
    const viewModel = selectFormViewModel({
      profile,
      seedCams,
      profiles,
      editingId: state.getValue("editingId"),
      defaultSiteKey: siteKeys[0],
    });
    applyFormViewModel({
      viewModel,
      elements: {
        nameInput,
        tagsInput,
        folderInput,
        notesInput,
        camRows,
        socialRows,
        attachField,
        attachSelect,
      },
      createFormRow,
      siteKeys,
      sites,
      socialOptions: SOCIAL_OPTIONS,
      parseCamInput,
      parseSocialInput,
      selectedAttachId,
    });
  }

  function handleAttachChange() {
    const selectedId = getAttachSelection({ attachField, attachSelect });
    const viewModel = selectAttachFormViewModel({
      selectedId,
      profiles: state.getValue("attachProfiles"),
      seedCams: state.getValue("attachSeedCams"),
      editingId: state.getValue("editingId"),
      defaultSiteKey: siteKeys[0],
    });
    if (!viewModel) return;
    applyFormViewModel({
      viewModel,
      elements: {
        nameInput,
        tagsInput,
        folderInput,
        notesInput,
        camRows,
        socialRows,
        attachField,
        attachSelect,
      },
      createFormRow,
      siteKeys,
      sites,
      socialOptions: SOCIAL_OPTIONS,
      parseCamInput,
      parseSocialInput,
      selectedAttachId: selectedId || "",
    });
  }

  function openEditor(profile, seedCams, source = "list", profiles = []) {
    state.set({
      editingId: profile ? profile.id : null,
      currentProfile: profile || null,
      lastView: source,
      attachProfiles: profiles || [],
      attachSeedCams: seedCams || [],
    });
    applyForm(profile, seedCams, state.getValue("attachProfiles"));
    const currentFolder = profile ? profile.folder : "";
    if (state.getValue("attachProfiles").length) {
      updateFolderOptions(state.getValue("attachProfiles"), currentFolder);
    } else {
      fetchProfiles().then((profiles) => updateFolderOptions(profiles, currentFolder));
    }
    viewState.go("form", profile ? "Edit profile" : "New profile");
  }

  async function addFromCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const parsed = tab?.url ? parseUrl(tab.url) : null;
    const seedCams = parsed ? [{ site: parsed.site, username: parsed.username }] : [];
    if (!seedCams.length) {
      openEditor(null, [], "list", await fetchProfiles());
      return;
    }

    const profiles = await fetchProfiles();
    const duplicate = findDuplicateProfile(profiles, { cams: seedCams }, null);
    if (duplicate) {
      openEditor(duplicate, null, "detail");
    } else {
      openEditor(null, seedCams, "list", profiles);
    }
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

  async function renderList() {
    const profiles = await fetchProfiles();
    const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
    updateFolderOptions(profiles);
    const listControls = selectListControlsViewModel({
      query: state.getValue("listQuery"),
      sortKey: state.getValue("listSortKey"),
      folderFilter: state.getValue("listFolderFilter"),
    });
    const viewModel = selectProfileListViewModel(profiles, {
      query: listControls.query,
      folderKey: listControls.folderKey,
      sortKey: listControls.sortKey,
      sites,
      getPlatformIconSvg,
    });
    renderProfileList({
      profiles: viewModel.profiles,
      elements: { profileList, emptyState },
      selection,
      getPinIconSvg,
      onPinToggle: async (profileId) => {
        await toggleProfilePin(profileId);
        renderList();
      },
      onOpenDetail: (profileId) => {
        const profile = profilesById.get(profileId);
        if (profile) viewState.go("detail", profile);
      },
      emptyMessage: viewModel.emptyMessage,
    });
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

  const bindEvents = (bindings) => {
    bindings.forEach(({ element, event, handler }) => {
      if (!element) return;
      element.addEventListener(event, handler);
    });
  };

  const createRow = (type) =>
    createFormRow({
      type,
      values: {},
      siteKeys,
      sites,
      socialOptions: SOCIAL_OPTIONS,
      parseCamInput,
      parseSocialInput,
    });

  bindEvents([
    ...createFolderSelectHandlers({ folderSelect, folderInput }),
    {
      element: addCamButton,
      event: "click",
      handler: () => camRows.appendChild(createRow("cam")),
    },
    {
      element: addSocialButton,
      event: "click",
      handler: () => socialRows.appendChild(createRow("social")),
    },
    {
      element: attachSelect,
      event: "change",
      handler: handleAttachChange,
    },
    {
      element: addButton,
      event: "click",
      handler: addFromCurrentTab,
    },
    {
      element: backButton,
      event: "click",
      handler: () => viewState.go("list"),
    },
    {
      element: folderManagerButton,
      event: "click",
      handler: () => viewState.go("folder"),
    },
    {
      element: folderBackButton,
      event: "click",
      handler: () => viewState.go("list"),
    },
    {
      element: settingsToggle,
      event: "click",
      handler: () => {
        if (isEmbedded) {
          viewState.toggleSettings();
          return;
        }
        openOptionsPage();
      },
    },
    {
      element: cancelButton,
      event: "click",
      handler: () => {
        const lastView = state.getValue("lastView");
        const currentProfile = state.getValue("currentProfile");
        if (lastView === "detail" && currentProfile) {
          viewState.go("detail", currentProfile);
        } else {
          viewState.go("list");
        }
      },
    },
    {
      element: detailBackButton,
      event: "click",
      handler: () => viewState.go("list"),
    },
    {
      element: detailPinButton,
      event: "click",
      handler: async () => {
        const currentProfile = state.getValue("currentProfile");
        if (!currentProfile) return;
        const { updatedProfile } = await toggleProfilePin(currentProfile.id);
        if (updatedProfile) viewState.go("detail", updatedProfile);
      },
    },
    {
      element: detailEditButton,
      event: "click",
      handler: () => {
        const currentProfile = state.getValue("currentProfile");
        if (!currentProfile) return;
        openEditor(currentProfile, null, "detail");
      },
    },
    {
      element: deleteButton,
      event: "click",
      handler: async () => {
        const editingId = state.getValue("editingId");
        const currentProfile = state.getValue("currentProfile");
        if (!editingId) return;
        const name = (currentProfile && currentProfile.name) || "this profile";
        const confirmed = await dialogs.confirmDeleteProfile(name);
        if (!confirmed) return;
        await deleteProfileById(editingId);
        state.set({ editingId: null, currentProfile: null });
        viewState.go("list");
      },
    },
    ...createListControlHandlers({
      elements: { searchInput, sortSelect, folderFilter },
      onQueryChange: (value) => {
        state.setValue("listQuery", value || "");
        renderList();
      },
      onSortChange: async (value) => {
        await saveSortPreference(value, SORT_OPTIONS);
        state.setValue("listSortKey", value);
        renderList();
      },
      onFolderFilterChange: async (value) => {
        const nextValue = await handleFolderFilterChange(value);
        state.set({
          preferredFolderFilter: nextValue,
          listFolderFilter: nextValue,
        });
        renderList();
      },
    }),
    ...createSearchHoverHandlers({ searchSort, searchInput }),
    {
      element: profileForm,
      event: "submit",
      handler: async (event) => {
        event.preventDefault();
        clearFormError(formError);

        const selectedAttachId = getAttachSelection({ attachField, attachSelect });
        const formData = getFormData({
          elements: {
            nameInput,
            tagsInput,
            folderSelect,
            folderInput,
            notesInput,
            camRows,
            socialRows,
          },
        });
        const result = await saveProfileForm({
          editingId: state.getValue("editingId"),
          attachSelectedId: selectedAttachId,
          formData,
        });
        if (result.error) {
          showFormError(formError, result.error);
          return;
        }
        viewState.go("detail", result.savedProfile);
      },
    },
  ]);

  async function getActiveTab() {
    if (!chrome.tabs?.query) return null;
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        resolve(tabs?.[0] || null);
      });
    });
  }

  async function showInitialView() {
    const profiles = await fetchProfiles();
    let tab = null;
    try {
      tab = await getActiveTab();
    } catch (error) {
      tab = null;
    }
    const parsed = tab?.url ? parseUrl(tab.url) : null;
    if (parsed) {
      const match = findDuplicateProfile(
        profiles,
        { cams: [{ site: parsed.site, username: parsed.username }] },
        null,
      );
      if (match) {
        viewState.go("detail", match);
        return;
      }
    }
    const socialParsed = tab?.url ? parseSocialUrl(tab.url) : null;
    if (socialParsed) {
      const socialMatch = profiles.find((profile) =>
        (profile.socials || []).some(
          (social) =>
            normalizeText(social.platform) === socialParsed.platform &&
            normalizeSocialHandle(social.platform, social.handle) === socialParsed.handle,
        ),
      );
      if (socialMatch) {
        viewState.go("detail", socialMatch);
        return;
      }
    }
    viewState.go("list");
  }

  const start = async () => {
    await refreshSites();
    await Promise.all([loadSocialIcons(), loadPlatformIcons()]);
    await applyListPreferences();
    if (initialTab === "settings" || isEmbedded) {
      viewState.go("settings");
      return;
    }
    showInitialView();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
}
