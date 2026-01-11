import SITES, { SITE_KEYS } from "../../lib/domain/sites.js";
import {
  parseCamInput,
  parseSocialInput,
  parseSocialUrl,
  parseUrl,
  buildSocialUrl,
} from "../../lib/domain/urls.js";
import { SOCIAL_OPTIONS } from "../../lib/domain/socialOptions.js";
import { createBulkSelection } from "../../lib/bulkSelection.js";
import { initConfirmModal } from "../../lib/confirmModal.js";
import {
  formatDuration,
  formatSocialHandle,
  normalizeSocialHandle,
  selectDetailViewModel,
  selectFolderManagerViewModel,
  selectProfileListViewModel,
  selectFormViewModel,
  selectAttachFormViewModel,
  selectFolderOptionsViewModel,
  truncateText,
} from "./selectors.js";
import { findDuplicateProfile } from "../../lib/domain/profiles.js";
import { normalizeText } from "../../lib/domain/text.js";
import { SETTINGS_DEFAULTS } from "../../lib/domain/settings.js";
import {
  deleteProfileById,
  deleteProfilesByIds,
  fetchProfiles,
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
  } = elements;

  const settingsIcon = settingsToggle?.querySelector(".settings-icon") || null;
  const overviewIcon = settingsToggle?.querySelector(".overview-icon") || null;
  const showConfirm = initConfirmModal();
  const DEFAULT_SORT = SETTINGS_DEFAULTS.lastSort;
  const SORT_OPTIONS = new Set(["most", "month", "recent", "updated", "name"]);
  const state = createPopupState();

  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get("tab");
  const isEmbedded = urlParams.get("embed") === "1";

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
      showDetailView(merged);
    },
    onDelete: async (ids) => {
      if (!ids.length) return;
      const profiles = await fetchProfiles();
      const names = profiles
        .filter((item) => ids.includes(item.id))
        .map((item) => item.name || "Unnamed");
      const confirmed = await showConfirm({
        titleText: "Delete profiles",
        messageText: `Delete ${names.length} profile${names.length === 1 ? "" : "s"}? This cannot be undone.`,
        items: names,
      });
      if (!confirmed) return;
      await deleteProfilesByIds(ids);
      selection.setSelectMode(false);
      renderList();
    },
    onRender: () => renderList(),
  });

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
    });
  }

  function showListView() {
    setViewVisibility(
      { listView, formView, detailView, folderView, settingsView },
      "list",
    );
    setSettingsToggleState(
      { settingsToggle, settingsIcon, overviewIcon, isEmbedded },
      "settings",
    );
    clearFormError(formError);
    selection.setSelectMode(false);
    renderList();
    state.set({
      lastView: "list",
      lastNonSettingsView: "list",
    });
  }

  function showFormView(title) {
    formTitle.textContent = title;
    setViewVisibility(
      { listView, formView, detailView, folderView, settingsView },
      "form",
    );
    setSettingsToggleState(
      { settingsToggle, settingsIcon, overviewIcon, isEmbedded },
      "hidden",
    );
    state.setValue("lastNonSettingsView", "form");
    deleteButton.classList.toggle("hidden", !state.getValue("editingId"));
  }

  function showDetailView(profile) {
    state.setValue("currentProfile", profile);
    const viewModel = selectDetailViewModel(profile, {
      formatDuration,
      formatSocialHandle,
      buildSocialUrl,
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
      sites: SITES,
      getPlatformIconSvg,
      getSocialIconSvg,
      getPinIconSvg,
      getFolderIconSvg,
    });

    setViewVisibility(
      { listView, formView, detailView, folderView, settingsView },
      "detail",
    );
    state.setValue("lastView", "detail");
    setSettingsToggleState(
      { settingsToggle, settingsIcon, overviewIcon, isEmbedded },
      "hidden",
    );
    state.setValue("lastNonSettingsView", "detail");
  }

  function showFolderView() {
    setViewVisibility(
      { listView, formView, detailView, folderView, settingsView },
      "folder",
    );
    setSettingsToggleState(
      { settingsToggle, settingsIcon, overviewIcon, isEmbedded },
      "settings",
    );
    selection.setSelectMode(false);
    renderFolderManagerView();
    state.set({
      lastView: "list",
      lastNonSettingsView: "folder",
    });
  }

  function showSettingsView() {
    setViewVisibility(
      { listView, formView, detailView, folderView, settingsView },
      "settings",
    );
    selection.setSelectMode(false);
    state.setValue("lastView", "settings");
    setSettingsToggleState(
      { settingsToggle, settingsIcon, overviewIcon, isEmbedded },
      "overview",
    );
    if (isEmbedded) document.body.classList.add("embedded");
  }

  function toggleSettingsView() {
    if (!settingsView.classList.contains("hidden")) {
      const lastNonSettingsView = state.getValue("lastNonSettingsView");
      const currentProfile = state.getValue("currentProfile");
      const editingId = state.getValue("editingId");
      switch (lastNonSettingsView) {
        case "folder":
          showFolderView();
          return;
        case "detail":
          if (currentProfile) showDetailView(currentProfile);
          else showListView();
          return;
        case "form":
          if (currentProfile || editingId) showFormView(formTitle.textContent || "Edit profile");
          else showListView();
          return;
        default:
          showListView();
          return;
      }
    }
    showSettingsView();
  }

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
    onlyfans: "src/assets/social-icons/onlyfans.svg",
    tiktok: "src/assets/social-icons/tiktok.svg",
    reddit: "src/assets/social-icons/reddit.svg",
    fansly: "src/assets/social-icons/fansly.svg",
    telegram: "src/assets/social-icons/telegram.svg",
    threads: "src/assets/social-icons/threads.svg",
    youtube: "src/assets/social-icons/youtube.svg",
    website: "src/assets/social-icons/website.svg",
    other: "src/assets/social-icons/website.svg",
    link: "src/assets/social-icons/link.svg",
  };

  const PLATFORM_ICON_CACHE = new Map();
  const PLATFORM_ICON_PATHS = {
    "chaturbate.com": "src/assets/platform-icons/chaturbate.svg",
    "stripchat.com": "src/assets/platform-icons/stripchat.svg",
  };

  function updateFolderOptions(profiles, currentFolder) {
    const preferredFolderOrder = state.getValue("preferredFolderOrder");
    const preferredFolderFilter = state.getValue("preferredFolderFilter");
    const viewModel = selectFolderOptionsViewModel({
      profiles,
      preferredOrder: preferredFolderOrder,
      selectedFilter: folderFilter?.value || "",
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
        const confirmed = await showConfirm({
          titleText: "Delete folder",
          messageText: `Delete folder "${folder.name}"? Profiles in this folder will move to "No folder".`,
        });
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
      defaultSiteKey: SITE_KEYS[0],
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
      siteKeys: SITE_KEYS,
      sites: SITES,
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
      defaultSiteKey: SITE_KEYS[0],
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
      siteKeys: SITE_KEYS,
      sites: SITES,
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
    showFormView(profile ? "Edit profile" : "New profile");
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

  async function renderList() {
    const profiles = await fetchProfiles();
    updateFolderOptions(profiles);
    const selectedFolder = normalizeText(folderFilter?.value || "");
    const viewModel = selectProfileListViewModel(profiles, {
      query: searchInput.value,
      folderKey: selectedFolder,
      sortKey: sortSelect.value,
    });
    renderProfileList({
      profiles: viewModel.profiles,
      elements: { profileList, emptyState },
      selection,
      sites: SITES,
      getPlatformIconSvg,
      getPinIconSvg,
      truncateText,
      onPinToggle: async (profileId) => {
        await toggleProfilePin(profileId);
        renderList();
      },
      onOpenDetail: showDetailView,
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
      siteKeys: SITE_KEYS,
      sites: SITES,
      socialOptions: SOCIAL_OPTIONS,
      parseCamInput,
      parseSocialInput,
    });

  bindEvents([
    {
      element: folderSelect,
      event: "change",
      handler: () => {
        if (folderSelect.value === "__new__") {
          folderInput.classList.remove("hidden");
          folderInput.focus();
        } else {
          folderInput.classList.add("hidden");
          folderInput.value = "";
        }
      },
    },
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
      handler: showListView,
    },
    {
      element: folderManagerButton,
      event: "click",
      handler: showFolderView,
    },
    {
      element: folderBackButton,
      event: "click",
      handler: showListView,
    },
    {
      element: settingsToggle,
      event: "click",
      handler: toggleSettingsView,
    },
    {
      element: cancelButton,
      event: "click",
      handler: () => {
        const lastView = state.getValue("lastView");
        const currentProfile = state.getValue("currentProfile");
        if (lastView === "detail" && currentProfile) {
          showDetailView(currentProfile);
        } else {
          showListView();
        }
      },
    },
    {
      element: detailBackButton,
      event: "click",
      handler: showListView,
    },
    {
      element: detailPinButton,
      event: "click",
      handler: async () => {
        const currentProfile = state.getValue("currentProfile");
        if (!currentProfile) return;
        const { updatedProfile } = await toggleProfilePin(currentProfile.id);
        if (updatedProfile) showDetailView(updatedProfile);
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
        const confirmed = await showConfirm({
          titleText: "Delete profile",
          messageText: `Delete ${name}? This cannot be undone.`,
        });
        if (!confirmed) return;
        await deleteProfileById(editingId);
        state.set({ editingId: null, currentProfile: null });
        showListView();
      },
    },
    {
      element: searchInput,
      event: "input",
      handler: renderList,
    },
    {
      element: sortSelect,
      event: "change",
      handler: async () => {
        await saveSortPreference(sortSelect.value, SORT_OPTIONS);
        renderList();
      },
    },
    {
      element: folderFilter,
      event: "change",
      handler: async () => {
        const nextValue = await handleFolderFilterChange(folderFilter.value);
        state.setValue("preferredFolderFilter", nextValue);
        renderList();
      },
    },
    ...(searchSort && searchInput
      ? [
          {
            element: searchSort.querySelector(".search-toggle"),
            event: "mouseenter",
            handler: () => searchSort.classList.add("search-active"),
          },
          {
            element: searchInput,
            event: "mouseenter",
            handler: () => searchSort.classList.add("search-active"),
          },
          {
            element: searchInput,
            event: "focus",
            handler: () => searchSort.classList.add("search-active"),
          },
          {
            element: searchInput,
            event: "blur",
            handler: () => {
              if (document.activeElement === searchInput) return;
              searchSort.classList.remove("search-active");
            },
          },
          {
            element: searchSort,
            event: "mouseleave",
            handler: () => {
              if (document.activeElement === searchInput) return;
              searchSort.classList.remove("search-active");
            },
          },
        ]
      : []),
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
        showDetailView(result.savedProfile);
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
        showDetailView(match);
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
        showDetailView(socialMatch);
        return;
      }
    }
    showListView();
  }

  const start = async () => {
    await Promise.all([loadSocialIcons(), loadPlatformIcons()]);
    await applyListPreferences();
    if (initialTab === "settings" || isEmbedded) {
      showSettingsView();
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
