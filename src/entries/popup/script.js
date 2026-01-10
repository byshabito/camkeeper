import SITES, { SITE_KEYS } from "../../config/sites.js";
import { parseSocialUrl, parseUrl } from "../../lib/utils/ParseSiteUrls.js";
import {
  SOCIAL_OPTIONS,
  createId,
  findDuplicateProfile,
  matchQuery,
  mergeProfiles,
  normalizeText,
  sanitizeCams,
  sanitizeProfile,
  sanitizeSocials,
  splitTags,
} from "../../lib/storage.js";
import { getProfiles, getSettings, saveProfiles, saveSettings } from "../../lib/db.js";
import { createBulkSelection } from "../../lib/bulkSelection.js";
import { initConfirmModal } from "../../lib/confirmModal.js";
import { sortBySelection } from "../../lib/sort.js";

const listView = document.getElementById("list-view");
const formView = document.getElementById("form-view");
const detailView = document.getElementById("detail-view");
const profileList = document.getElementById("profile-list");
const searchInput = document.getElementById("search-input");
const searchSort = document.querySelector(".search-sort");
const sortSelect = document.getElementById("sort-select");
const emptyState = document.getElementById("empty-state");
const folderView = document.getElementById("folder-view");
const settingsView = document.getElementById("settings-view");
const folderBackButton = document.getElementById("folder-back");
const folderList = document.getElementById("folder-list");
const folderEmpty = document.getElementById("folder-empty");
const folderManagerButton = document.getElementById("folder-manager-button");
const selectButton = document.getElementById("select-button");
const addButton = document.getElementById("add-button");
const backButton = document.getElementById("back-button");
const cancelButton = document.getElementById("cancel-button");
const deleteButton = document.getElementById("delete-button");
const detailBackButton = document.getElementById("detail-back");
const detailPinButton = document.getElementById("detail-pin");
const detailEditButton = document.getElementById("detail-edit");
const formTitle = document.getElementById("form-title");
const formError = document.getElementById("form-error");
const profileForm = document.getElementById("profile-form");
const attachField = document.getElementById("attach-field");
const attachSelect = document.getElementById("attach-select");
const nameInput = document.getElementById("name-input");
const tagsInput = document.getElementById("tags-input");
const folderSelect = document.getElementById("folder-select");
const folderInput = document.getElementById("folder-input");
const notesInput = document.getElementById("notes-input");
const camRows = document.getElementById("cam-rows");
const socialRows = document.getElementById("social-rows");
const addCamButton = document.getElementById("add-cam");
const addSocialButton = document.getElementById("add-social");
const detailTitle = document.getElementById("detail-title");
const detailName = document.getElementById("detail-name");
const detailMeta = document.getElementById("detail-meta");
const detailCams = document.getElementById("detail-cams");
const detailSocials = document.getElementById("detail-socials");
const detailTags = document.getElementById("detail-tags");
const detailFolder = document.getElementById("detail-folder");
const detailNotes = document.getElementById("detail-notes");
const bulkBar = document.getElementById("bulk-bar");
const bulkCount = document.getElementById("bulk-count");
const bulkMerge = document.getElementById("bulk-merge");
const bulkDelete = document.getElementById("bulk-delete");
const bulkCancel = document.getElementById("bulk-cancel");
const folderFilter = document.getElementById("folder-filter");
const onlineFilter = document.getElementById("online-filter");
const settingsToggle = document.getElementById("settings-toggle");
const settingsIcon = settingsToggle?.querySelector(".settings-icon") || null;
const overviewIcon = settingsToggle?.querySelector(".overview-icon") || null;
const showConfirm = initConfirmModal();
const DEFAULT_SORT = "month";
const SORT_OPTIONS = new Set(["most", "month", "recent", "updated", "name"]);
let preferredFolderFilter = "";
let preferredFolderOrder = [];

const urlParams = new URLSearchParams(window.location.search);
const initialTab = urlParams.get("tab");
const isEmbedded = urlParams.get("embed") === "1";

let editingId = null;
let currentProfile = null;
let lastView = "list";
let lastNonSettingsView = "list";
let attachTargetId = null;
let attachProfiles = [];
let attachSeedCams = [];
const selection = createBulkSelection({
  bulkBar,
  bulkCount,
  bulkMerge,
  bulkDelete,
  bulkCancel,
  selectButton,
  onMerge: async (ids) => {
    if (ids.length < 2) return;
    const profiles = await getProfiles();
    const base = profiles.find((item) => item.id === ids[0]);
    if (!base) return;
    const toMerge = profiles.filter((item) => ids.includes(item.id) && item.id !== base.id);
    const merged = toMerge.reduce((acc, item) => mergeProfiles(acc, item), base);
    const updated = profiles.filter((item) => !ids.includes(item.id)).concat(merged);
    await saveProfiles(updated);
    selection.setSelectMode(false);
    showDetailView(merged);
  },
  onDelete: async (ids) => {
    if (!ids.length) return;
    const profiles = await getProfiles();
    const names = profiles
      .filter((item) => ids.includes(item.id))
      .map((item) => item.name || "Unnamed");
    const confirmed = await showConfirm({
      titleText: "Delete bookmarks",
      messageText: `Delete ${names.length} bookmark${names.length === 1 ? "" : "s"}? This cannot be undone.`,
      items: names,
    });
    if (!confirmed) return;
    const updated = profiles.filter((item) => !ids.includes(item.id));
    await saveProfiles(updated);
    selection.setSelectMode(false);
    renderList();
  },
  onRender: () => renderList(),
});

async function loadListPreferences() {
  const settings = await getSettings();
  if (sortSelect) {
    const preferred = settings?.lastSort;
    if (SORT_OPTIONS.has(preferred)) {
      sortSelect.value = preferred;
    } else {
      sortSelect.value = DEFAULT_SORT;
    }
  }
  if (onlineFilter) {
    const onlineChecksEnabled =
      typeof settings?.onlineChecksEnabled === "boolean" ? settings.onlineChecksEnabled : true;
    const onlineToggle = onlineFilter.closest(".filter-toggle");
    if (onlineToggle) {
      onlineToggle.classList.toggle("hidden", !onlineChecksEnabled);
    }
    if (onlineChecksEnabled) {
      onlineFilter.checked = Boolean(settings?.onlineOnly);
    } else {
      onlineFilter.checked = false;
      if (settings?.onlineOnly) {
        await saveOnlinePreference(false);
      }
    }
  }
  preferredFolderFilter = typeof settings?.lastFolderFilter === "string"
    ? settings.lastFolderFilter
    : "";
  preferredFolderOrder = Array.isArray(settings?.lastFolderOrder)
    ? settings.lastFolderOrder.filter((item) => typeof item === "string")
    : [];
}

async function saveSortPreference(value) {
  if (!SORT_OPTIONS.has(value)) return;
  const settings = await getSettings();
  await saveSettings({
    ...settings,
    lastSort: value,
  });
}

async function saveOnlinePreference(value) {
  const settings = await getSettings();
  await saveSettings({
    ...settings,
    onlineOnly: Boolean(value),
  });
}

async function saveFolderPreference(value) {
  const settings = await getSettings();
  await saveSettings({
    ...settings,
    lastFolderFilter: value || "",
  });
}

async function saveFolderOrderPreference(order) {
  const settings = await getSettings();
  await saveSettings({
    ...settings,
    lastFolderOrder: Array.isArray(order) ? order : [],
  });
}

function showListView() {
  listView.classList.remove("hidden");
  formView.classList.add("hidden");
  detailView.classList.add("hidden");
  folderView.classList.add("hidden");
  settingsView.classList.add("hidden");
  if (settingsToggle && !isEmbedded) settingsToggle.classList.remove("hidden");
  if (settingsIcon) settingsIcon.classList.remove("hidden");
  if (overviewIcon) overviewIcon.classList.add("hidden");
  if (settingsToggle) {
    settingsToggle.setAttribute("aria-label", "Settings page");
    settingsToggle.setAttribute("title", "Settings page");
  }
  formError.classList.add("hidden");
  selection.setSelectMode(false);
  renderList();
  lastView = "list";
  lastNonSettingsView = "list";
}

function showFormView(title) {
  formTitle.textContent = title;
  listView.classList.add("hidden");
  detailView.classList.add("hidden");
  folderView.classList.add("hidden");
  settingsView.classList.add("hidden");
  formView.classList.remove("hidden");
  if (settingsToggle) settingsToggle.classList.add("hidden");
  lastNonSettingsView = "form";
  deleteButton.classList.toggle("hidden", !editingId);
  if (editingId) {
    attachField.classList.add("hidden");
    attachSelect.innerHTML = "";
    attachTargetId = null;
  } else {
    setAttachOptions(attachProfiles, attachSeedCams);
  }
}

function showDetailView(profile) {
  currentProfile = profile;
  detailTitle.textContent = "Bookmark";
  detailName.textContent = profile.name || "Unnamed";
  detailMeta.textContent = `Updated ${new Date(profile.updatedAt || Date.now()).toLocaleDateString()}`;
  detailPinButton.classList.add("pin-toggle", "detail-pin");
  detailPinButton.classList.toggle("pinned", profile.pinned);
  detailPinButton.title = profile.pinned ? "Unpin" : "Pin";
  detailPinButton.setAttribute("aria-label", detailPinButton.title);
  detailPinButton.innerHTML = `${getPinIconSvg(profile.pinned)}<span>${
    profile.pinned ? "Unpin" : "Pin"
  }</span>`;

  detailCams.innerHTML = "";
  [...(profile.cams || [])]
    .sort((a, b) => (b.viewMs || 0) - (a.viewMs || 0))
    .forEach((cam) => {
      const site = SITES[cam.site];
      if (!site) return;
      const link = document.createElement("a");
    link.href = site.url(cam.username);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.classList.add("platform-link");

    const chip = document.createElement("span");
    chip.classList.add("platform-chip");
    const isOnline = Boolean(cam.online);
    chip.classList.add(isOnline ? "online" : "offline");
    chip.style.setProperty("--platform-color", site.color);

    const icon = document.createElement("span");
    icon.classList.add("icon");
    icon.style.color = site.color;
    icon.style.borderColor = "transparent";
    const platformIcon = getPlatformIconSvg(cam.site);
    if (platformIcon) {
      icon.innerHTML = platformIcon;
    } else {
      icon.textContent = site.abbr;
    }

    const label = document.createElement("span");
    label.classList.add("username");
    const viewMs = Number.isFinite(cam.viewMs) ? cam.viewMs : 0;
    label.textContent = cam.username;
    chip.title = `Total view time: ${formatDuration(viewMs)}`;

    chip.appendChild(icon);
    chip.appendChild(label);
    link.appendChild(chip);
      detailCams.appendChild(link);
    });

  detailSocials.innerHTML = "";
  profile.socials.forEach((social) => {
    const label = social.platform === "x" ? "X" : social.platform;
    const url = buildSocialUrl(social);

    let chipHost = detailSocials;
    if (url) {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.classList.add("platform-link");
      detailSocials.appendChild(link);
      chipHost = link;
    }

    const chip = document.createElement("span");
    chip.classList.add("social-chip", "chip-icon");

    const icon = document.createElement("span");
    icon.classList.add("icon");
    icon.innerHTML = getSocialIconSvg(social.platform);

    const text = document.createElement("span");
    text.textContent = social.handle;

    chip.appendChild(icon);
    chip.appendChild(text);
    chipHost.appendChild(chip);
  });

  detailTags.innerHTML = "";
  profile.tags.forEach((tag) => {
    const chip = document.createElement("span");
    chip.classList.add("chip");
    chip.textContent = tag;
    detailTags.appendChild(chip);
  });

  detailFolder.innerHTML = "";
  if (profile.folder) {
    detailFolder.classList.remove("hidden");
    detailFolder.innerHTML = `<span>${profile.folder}</span>${getFolderIconSvg()}`;
  } else {
    detailFolder.classList.add("hidden");
  }

  detailNotes.textContent = profile.notes || "";

  listView.classList.add("hidden");
  formView.classList.add("hidden");
  folderView.classList.add("hidden");
  settingsView.classList.add("hidden");
  detailView.classList.remove("hidden");
  lastView = "detail";
  if (settingsToggle) settingsToggle.classList.add("hidden");
  lastNonSettingsView = "detail";
}

function showFolderView() {
  listView.classList.add("hidden");
  formView.classList.add("hidden");
  detailView.classList.add("hidden");
  settingsView.classList.add("hidden");
  folderView.classList.remove("hidden");
  if (settingsToggle && !isEmbedded) settingsToggle.classList.remove("hidden");
  if (settingsIcon) settingsIcon.classList.remove("hidden");
  if (overviewIcon) overviewIcon.classList.add("hidden");
  if (settingsToggle) {
    settingsToggle.setAttribute("aria-label", "Settings page");
    settingsToggle.setAttribute("title", "Settings page");
  }
  selection.setSelectMode(false);
  renderFolderManager();
  lastView = "list";
  lastNonSettingsView = "folder";
}

function showSettingsView() {
  listView.classList.add("hidden");
  formView.classList.add("hidden");
  detailView.classList.add("hidden");
  folderView.classList.add("hidden");
  settingsView.classList.remove("hidden");
  selection.setSelectMode(false);
  lastView = "settings";
  if (settingsToggle) settingsToggle.classList.toggle("hidden", isEmbedded);
  if (settingsIcon) settingsIcon.classList.add("hidden");
  if (overviewIcon) overviewIcon.classList.remove("hidden");
  if (settingsToggle) {
    settingsToggle.setAttribute("aria-label", "Overview");
    settingsToggle.setAttribute("title", "Overview");
  }
  if (isEmbedded) document.body.classList.add("embedded");
}

function toggleSettingsView() {
  if (!settingsView.classList.contains("hidden")) {
    switch (lastNonSettingsView) {
      case "folder":
        showFolderView();
        return;
      case "detail":
        if (currentProfile) showDetailView(currentProfile);
        else showListView();
        return;
      case "form":
        if (currentProfile || editingId) showFormView(formTitle.textContent || "Edit bookmark");
        else showListView();
        return;
      default:
        showListView();
        return;
    }
  }
  showSettingsView();
}

function buildSocialUrl(social) {
  const handle = (social.handle || "").trim();
  if (!handle) return null;

  if (/^https?:\/\//i.test(handle)) return handle;

  const normalized = handle.replace(/^@/, "");
  const platform = normalizeText(social.platform);

  switch (platform) {
    case "fansly":
      return `https://fansly.com/${normalized}`;
    case "instagram":
      return `https://instagram.com/${normalized}`;
    case "threads":
      return `https://www.threads.net/@${normalized}`;
    case "telegram":
      return `https://t.me/${normalized}`;
    case "youtube":
      return `https://www.youtube.com/@${normalized}`;
    case "x":
      return `https://x.com/${normalized}`;
    case "onlyfans":
      return `https://onlyfans.com/${normalized}`;
    case "tiktok":
      return `https://www.tiktok.com/@${normalized}`;
    case "reddit":
      return `https://www.reddit.com/user/${normalized}`;
    case "website":
    case "other":
      return `https://${handle}`;
    default:
      return null;
  }
}

function getSocialIconSvg(platform) {
  const key = normalizeText(platform);
  return SOCIAL_ICON_CACHE.get(key) || SOCIAL_ICON_CACHE.get("link") || "";
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

function clearRows(container) {
  while (container.firstChild) container.removeChild(container.firstChild);
}

function normalizeFolderKey(folderName) {
  return normalizeText(folderName);
}

function orderFolderNames(names) {
  const folderMap = new Map(
    names.map((name) => [normalizeFolderKey(name), name]),
  );
  const ordered = [];
  preferredFolderOrder.forEach((key) => {
    const match = folderMap.get(key);
    if (match) {
      ordered.push(match);
      folderMap.delete(key);
    }
  });
  const remaining = Array.from(folderMap.values()).sort((a, b) => a.localeCompare(b));
  return ordered.concat(remaining);
}

function getFolderOptions(profiles) {
  const map = new Map();
  profiles.forEach((profile) => {
    const folder = (profile.folder || "").trim();
    if (!folder) return;
    const key = normalizeFolderKey(folder);
    if (!map.has(key)) map.set(key, folder);
  });
  return orderFolderNames(Array.from(map.values()));
}

function getFolderStats(profiles) {
  const map = new Map();
  profiles.forEach((profile) => {
    const folder = (profile.folder || "").trim();
    if (!folder) return;
    const key = normalizeFolderKey(folder);
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      return;
    }
    map.set(key, {
      key,
      name: folder,
      count: 1,
    });
  });
  const orderedNames = orderFolderNames(Array.from(map.values()).map((entry) => entry.name));
  return orderedNames.map((name) => map.get(normalizeFolderKey(name))).filter(Boolean);
}

function renderFolderFilter(folders) {
  if (!folderFilter) return;
  const current = folderFilter.value;
  folderFilter.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "All";
  folderFilter.appendChild(allOption);

  folders.forEach((folder) => {
    const option = document.createElement("option");
    option.value = folder;
    option.textContent = folder;
    folderFilter.appendChild(option);
  });

  const selection = current || preferredFolderFilter;
  if (selection) {
    const match = folders.find(
      (folder) => normalizeText(folder) === normalizeText(selection),
    );
    if (match) {
      folderFilter.value = match;
    } else {
      folderFilter.value = "";
      if (preferredFolderFilter) {
        preferredFolderFilter = "";
        saveFolderPreference("");
      }
    }
  } else {
    folderFilter.value = "";
  }
}

function renderFolderSelect(folders, currentFolder) {
  if (!folderSelect) return;
  const hasCurrent = typeof currentFolder === "string";
  const current = hasCurrent ? currentFolder : folderSelect.value;
  folderSelect.innerHTML = "";

  const noneOption = document.createElement("option");
  noneOption.value = "";
  noneOption.textContent = "No folder";
  folderSelect.appendChild(noneOption);

  folders.forEach((folder) => {
    const option = document.createElement("option");
    option.value = folder;
    option.textContent = folder;
    folderSelect.appendChild(option);
  });

  const newOption = document.createElement("option");
  newOption.value = "__new__";
  newOption.textContent = "New folder…";
  folderSelect.appendChild(newOption);

  if (current) {
    const match = folders.find((folder) => normalizeText(folder) === normalizeText(current));
    folderSelect.value = match || "__new__";
    if (!match) {
      folderInput.value = current;
      folderInput.classList.remove("hidden");
    } else {
      folderInput.value = "";
      folderInput.classList.add("hidden");
    }
  } else {
    folderSelect.value = "";
    folderInput.value = "";
    folderInput.classList.add("hidden");
  }
}

function updateFolderOptions(profiles, currentFolder) {
  const folders = getFolderOptions(profiles);
  renderFolderFilter(folders);
  renderFolderSelect(folders, currentFolder);
}

function matchesFolder(profile, selectedFolder) {
  if (!selectedFolder) return true;
  return normalizeText(profile.folder) === selectedFolder;
}

function matchesOnline(profile, onlyOnline) {
  if (!onlyOnline) return true;
  return (profile.cams || []).some((cam) => cam.online);
}

async function renameFolder(folderName, nextName) {
  const trimmed = (nextName || "").trim();
  if (!trimmed) return;
  const currentKey = normalizeText(folderName);
  const nextKey = normalizeText(trimmed);
  const profiles = await getProfiles();
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
  await saveProfiles(updated);
  if (currentKey !== nextKey) {
    const nextOrder = preferredFolderOrder.map((key) => (key === currentKey ? nextKey : key));
    preferredFolderOrder = Array.from(new Set(nextOrder));
    await saveFolderOrderPreference(preferredFolderOrder);
  }
  updateFolderOptions(updated, trimmed);
  renderFolderManager(updated);
}

async function deleteFolder(folderName) {
  const currentKey = normalizeText(folderName);
  const profiles = await getProfiles();
  const updated = profiles.map((profile) => {
    const folderKey = normalizeText(profile.folder);
    if (!folderKey || folderKey !== currentKey) return profile;
    return {
      ...profile,
      folder: "",
      updatedAt: Date.now(),
    };
  });
  await saveProfiles(updated);
  const nextOrder = preferredFolderOrder.filter((key) => key !== currentKey);
  if (nextOrder.length !== preferredFolderOrder.length) {
    preferredFolderOrder = nextOrder;
    await saveFolderOrderPreference(preferredFolderOrder);
  }
  updateFolderOptions(updated);
  renderFolderManager(updated);
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
  preferredFolderOrder = order;
  await saveFolderOrderPreference(preferredFolderOrder);
  const profiles = await getProfiles();
  updateFolderOptions(profiles);
  renderFolderManager(profiles);
}

async function renderFolderManager(prefetchedProfiles = null) {
  if (!folderList) return;
  const profiles = prefetchedProfiles || (await getProfiles());
  const folders = getFolderStats(profiles);
  folderList.innerHTML = "";
  folderEmpty.classList.toggle("hidden", folders.length > 0);

  folders.forEach((folder) => {
    const row = document.createElement("div");
    row.classList.add("folder-row");
    row.dataset.folderKey = folder.key;

    const dragHandle = document.createElement("div");
    dragHandle.classList.add("folder-drag-handle");
    dragHandle.setAttribute("aria-hidden", "true");
    dragHandle.draggable = true;
    dragHandle.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-grip-vertical-icon lucide-grip-vertical"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>';

    dragHandle.addEventListener("dragstart", (event) => {
      row.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", folder.key);
      const rect = row.getBoundingClientRect();
      event.dataTransfer.setDragImage(
        row,
        Math.max(0, event.clientX - rect.left),
        Math.max(0, event.clientY - rect.top),
      );
    });
    dragHandle.addEventListener("dragend", () => {
      row.classList.remove("dragging");
      const existing = folderList.querySelector(".folder-row.drag-over");
      if (existing) existing.classList.remove("drag-over");
    });
    row.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (row.classList.contains("dragging")) return;
      const existing = folderList.querySelector(".folder-row.drag-over");
      if (existing && existing !== row) existing.classList.remove("drag-over");
      row.classList.add("drag-over");
    });
    row.addEventListener("dragleave", () => {
      row.classList.remove("drag-over");
    });
    row.addEventListener("drop", async (event) => {
      event.preventDefault();
      row.classList.remove("drag-over");
      const sourceKey = event.dataTransfer.getData("text/plain");
      await handleFolderReorder(sourceKey, folder.key);
    });

    const meta = document.createElement("div");
    meta.classList.add("folder-row-meta");
    meta.textContent = `${folder.count} bookmark${folder.count === 1 ? "" : "s"}`;

    const actions = document.createElement("div");
    actions.classList.add("folder-row-actions");

    const input = document.createElement("input");
    input.type = "text";
    input.value = folder.name;
    input.setAttribute("aria-label", `Rename folder ${folder.name}`);
    input.addEventListener("blur", () => {
      const nextValue = input.value.trim();
      if (!nextValue) {
        input.value = folder.name;
        return;
      }
      if (normalizeText(nextValue) === normalizeText(folder.name)) {
        if (nextValue !== folder.name) renameFolder(folder.name, nextValue);
        return;
      }
      renameFolder(folder.name, nextValue);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        input.blur();
      }
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.classList.add("danger");
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", async () => {
      const confirmed = await showConfirm({
        titleText: "Delete folder",
        messageText: `Delete folder "${folder.name}"? Bookmarks in this folder will move to "No folder".`,
      });
      if (!confirmed) return;
      deleteFolder(folder.name);
    });

    actions.appendChild(input);
    actions.appendChild(deleteButton);

    const body = document.createElement("div");
    body.classList.add("folder-row-body");
    body.appendChild(actions);
    body.appendChild(meta);

    row.appendChild(dragHandle);
    row.appendChild(body);
    folderList.appendChild(row);
  });
}

function createRow({ type, values }) {
  const row = document.createElement("div");
  row.classList.add("row");

  const select = document.createElement("select");
  if (type === "cam") {
    SITE_KEYS.forEach((siteKey) => {
      const option = document.createElement("option");
      option.value = siteKey;
      option.textContent = SITES[siteKey].label;
      select.appendChild(option);
    });
    select.value = values.site || SITE_KEYS[0];
  } else {
    SOCIAL_OPTIONS.forEach((option) => {
      const opt = document.createElement("option");
      opt.value = option.id;
      opt.textContent = option.label;
      select.appendChild(opt);
    });
    select.value = values.platform || SOCIAL_OPTIONS[0].id;
  }

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = type === "cam" ? "Username" : "Handle or URL";
  input.value = type === "cam" ? values.username || "" : values.handle || "";
  if (type === "cam") {
    input.addEventListener("blur", () => {
      const parsed = parseCamInput(input.value);
      if (!parsed) return;
      if (parsed.site) select.value = parsed.site;
      input.value = parsed.username.toLowerCase();
    });
  }
  if (type === "social") {
    input.addEventListener("blur", () => {
      const parsed = parseSocialInput(input.value);
      if (!parsed) return;
      if (parsed.platform) select.value = parsed.platform;
      input.value = parsed.handle.toLowerCase();
    });
  }

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.textContent = "×";
  removeButton.classList.add("plain-button");
  removeButton.addEventListener("click", () => row.remove());

  row.appendChild(select);
  row.appendChild(input);
  row.appendChild(removeButton);

  return row;
}

function parseSocialInput(value) {
  const raw = (value || "").trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const host = url.hostname.replace(/^www\./, "").toLowerCase();
      const pathParts = url.pathname.split("/").filter(Boolean);
      const first = pathParts[0] || "";
      if (!first) return null;

      if (host === "instagram.com") {
        return { platform: "instagram", handle: first.replace(/^@/, "").toLowerCase() };
      }
      if (host === "x.com" || host === "twitter.com") {
        return { platform: "x", handle: first.replace(/^@/, "").toLowerCase() };
      }
      if (host === "onlyfans.com") {
        return { platform: "onlyfans", handle: first.replace(/^@/, "").toLowerCase() };
      }
      if (host === "tiktok.com") {
        const normalized = first.startsWith("@") ? first.slice(1) : first;
        return { platform: "tiktok", handle: normalized.toLowerCase() };
      }
      if (host === "reddit.com") {
        const userIdx = pathParts.indexOf("user");
        if (userIdx !== -1 && pathParts[userIdx + 1]) {
          return { platform: "reddit", handle: pathParts[userIdx + 1].toLowerCase() };
        }
        return { platform: "reddit", handle: first.replace(/^u\//, "").toLowerCase() };
      }
      return { platform: "website", handle: raw.toLowerCase() };
    } catch (e) {
      return null;
    }
  }

  return { platform: null, handle: raw.replace(/^@/, "").toLowerCase() };
}

function parseCamInput(value) {
  const raw = (value || "").trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const host = url.hostname.replace(/^www\./, "").toLowerCase();
      const parts = url.pathname.split("/").filter(Boolean);
      let username = "";

      if (host === "chaturbate.com") {
        if (url.pathname.startsWith("/in/")) {
          username = url.searchParams.get("room") || "";
        }
        if (!username) {
          username = parts[0] || "";
        }
        return username
          ? { site: "chaturbate.com", username: username.toLowerCase() }
          : null;
      }

      if (host === "stripchat.com") {
        username = parts[0] || "";
        return username
          ? { site: "stripchat.com", username: username.toLowerCase() }
          : null;
      }
    } catch (e) {
      return null;
    }
  }

  return { site: null, username: raw.replace(/^@/, "").toLowerCase() };
}

function populateForm(profile, seedCams) {
  nameInput.value = profile ? profile.name : "";
  tagsInput.value = profile ? (profile.tags || []).join(", ") : "";
  folderInput.value = profile ? profile.folder || "" : "";
  notesInput.value = profile ? profile.notes || "" : "";

  clearRows(camRows);
  const cams = profile?.cams?.length
    ? profile.cams
    : seedCams?.length
      ? seedCams
      : [{ site: SITE_KEYS[0], username: "" }];
  cams.forEach((cam) => {
    camRows.appendChild(createRow({ type: "cam", values: cam }));
  });

  clearRows(socialRows);
  const socials = profile?.socials?.length ? profile.socials : [{}];
  socials.forEach((social) => {
    socialRows.appendChild(createRow({ type: "social", values: social }));
  });
}

function setAttachOptions(profiles, seedCams) {
  attachTargetId = null;
  attachSelect.innerHTML = "";

  if (editingId || !seedCams?.length || !profiles.length) {
    attachField.classList.add("hidden");
    return;
  }

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Create new bookmark";
  attachSelect.appendChild(placeholder);

  profiles.forEach((profile) => {
    const option = document.createElement("option");
    option.value = profile.id;
    option.textContent = profile.name || "Unnamed";
    attachSelect.appendChild(option);
  });

  attachField.classList.remove("hidden");
}

function handleAttachChange() {
  const selectedId = attachSelect.value;
  if (!selectedId) {
    populateForm(null, attachSeedCams);
    return;
  }

  const target = attachProfiles.find((profile) => profile.id === selectedId);
  if (!target) return;

  const mergedCams = sanitizeCams([
    ...(target.cams || []),
    ...(attachSeedCams || []),
  ]);

  populateForm(
    {
      ...target,
      cams: mergedCams,
    },
    mergedCams,
  );
}

async function renderList() {
  const profiles = await getProfiles();
  updateFolderOptions(profiles);
  const query = normalizeText(searchInput.value);
  const selectedFolder = normalizeText(folderFilter?.value || "");
  const onlineOnly = Boolean(onlineFilter?.checked);
  const filtered = profiles.filter(
    (profile) =>
      matchQuery(profile, query) &&
      matchesFolder(profile, selectedFolder) &&
      matchesOnline(profile, onlineOnly),
  );
  const sorted = sortBySelection(filtered, sortSelect.value);

  profileList.innerHTML = "";
  emptyState.classList.toggle("hidden", sorted.length > 0);
  emptyState.textContent = query ? "No matches found." : "No bookmarks yet.";

  sorted.forEach((profile) => {
    const card = document.createElement("li");
    card.classList.add("card");
    if (selection.isActive()) card.classList.add("selectable");

    const main = document.createElement("div");
    main.classList.add("card-main");

    const title = document.createElement("div");
    title.classList.add("card-title");
    const name = document.createElement("h2");
    name.textContent = profile.name || "Unnamed";

    const pinButton = document.createElement("button");
    pinButton.type = "button";
    pinButton.classList.add("plain-button", "icon-button", "pin-toggle", "card-pin");
    if (profile.pinned) pinButton.classList.add("pinned");
    pinButton.title = profile.pinned ? "Unpin" : "Pin";
    pinButton.setAttribute("aria-label", pinButton.title);
    pinButton.innerHTML = getPinIconSvg(profile.pinned);
    pinButton.addEventListener("click", async (event) => {
      event.stopPropagation();
      const profiles = await getProfiles();
      const updated = profiles.map((item) =>
        item.id === profile.id ? { ...item, pinned: !item.pinned } : item,
      );
      await saveProfiles(updated);
      renderList();
    });
    card.appendChild(pinButton);

    const camChips = document.createElement("div");
    camChips.classList.add("chips");
    [...(profile.cams || [])]
      .sort((a, b) => (b.viewMs || 0) - (a.viewMs || 0))
      .forEach((cam) => {
      const site = SITES[cam.site];
      if (!site) return;
      const link = document.createElement("a");
      link.href = site.url(cam.username);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.classList.add("platform-link");
      link.addEventListener("click", (event) => {
        if (selection.isActive()) {
          event.preventDefault();
          selection.toggleSelection(profile.id);
        }
        event.stopPropagation();
      });

      const chip = document.createElement("span");
      chip.classList.add("platform-chip");
      const isOnline = Boolean(cam.online);
      chip.classList.add(isOnline ? "online" : "offline");
      chip.style.setProperty("--platform-color", site.color);
      chip.title = `${site.abbr}: ${cam.username}`;

      const icon = document.createElement("span");
      icon.classList.add("icon");
      icon.style.color = site.color;
      icon.style.borderColor = "transparent";
      const platformIcon = getPlatformIconSvg(cam.site);
      if (platformIcon) {
        icon.innerHTML = platformIcon;
      } else {
        icon.textContent = site.abbr;
      }

      chip.appendChild(icon);
      link.appendChild(chip);
        camChips.appendChild(link);
      });

    const tagChips = document.createElement("div");
    tagChips.classList.add("chips", "title-tags");
    (profile.tags || []).forEach((tag) => {
      const chip = document.createElement("span");
      chip.classList.add("chip");
      chip.textContent = tag;
      tagChips.appendChild(chip);
    });

    const note = document.createElement("div");
    note.classList.add("note");
    note.textContent = profile.notes ? truncate(profile.notes, 70) : "";

    title.appendChild(name);
    if (profile.tags?.length) title.appendChild(tagChips);

    main.appendChild(title);
    main.appendChild(camChips);
    if (profile.notes) main.appendChild(note);

    if (selection.isActive()) {
      if (selection.isSelected(profile.id)) {
        card.classList.add("selected");
      }
      card.addEventListener("click", () => {
        selection.toggleSelection(profile.id);
      });
    } else {
      card.addEventListener("click", () => showDetailView(profile));
    }

    card.appendChild(main);
    profileList.appendChild(card);
  });
}

function truncate(text, length) {
  const clean = (text || "").trim();
  if (clean.length <= length) return clean;
  return `${clean.slice(0, length - 1)}...`;
}

function formatDuration(ms) {
  const safeMs = Number.isFinite(ms) ? ms : 0;
  const totalMinutes = Math.floor(safeMs / 60000);
  if (totalMinutes < 60) return `${Math.max(totalMinutes, 0)}m`;
  const hoursTotal = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hoursTotal < 24) return minutes ? `${hoursTotal}h ${minutes}m` : `${hoursTotal}h`;
  const days = Math.floor(hoursTotal / 24);
  const hours = hoursTotal % 24;
  if (hours && minutes) return `${days}d ${hours}h ${minutes}m`;
  if (hours) return `${days}d ${hours}h`;
  return `${days}d`;
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

function openEditor(profile, seedCams, source = "list", profiles = []) {
  editingId = profile ? profile.id : null;
  currentProfile = profile || null;
  lastView = source;
  attachProfiles = profiles || [];
  attachSeedCams = seedCams || [];
  populateForm(profile, seedCams);
  const currentFolder = profile ? profile.folder : "";
  if (attachProfiles.length) {
    updateFolderOptions(attachProfiles, currentFolder);
  } else {
    getProfiles().then((profiles) => updateFolderOptions(profiles, currentFolder));
  }
  showFormView(profile ? "Edit bookmark" : "New bookmark");
}

async function addFromCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const parsed = tab?.url ? parseUrl(tab.url) : null;
  const seedCams = parsed ? [{ site: parsed.site, username: parsed.username }] : [];
  if (!seedCams.length) {
    openEditor(null, [], "list", await getProfiles());
    return;
  }

  const profiles = await getProfiles();
  const duplicate = findDuplicateProfile(profiles, { cams: seedCams }, null);
  if (duplicate) {
    openEditor(duplicate, null, "detail");
  } else {
    openEditor(null, seedCams, "list", profiles);
  }
}

function collectCams() {
  const rows = Array.from(camRows.querySelectorAll(".row"));
  return rows.map((row) => {
    const select = row.querySelector("select");
    const input = row.querySelector("input");
    return {
      site: select.value,
      username: input.value,
    };
  });
}

function collectSocials() {
  const rows = Array.from(socialRows.querySelectorAll(".row"));
  return rows.map((row) => {
    const select = row.querySelector("select");
    const input = row.querySelector("input");
    return {
      platform: select.value,
      handle: input.value,
    };
  });
}

function mergeCamStats(existingCams, updatedCams) {
  const existingMap = new Map(
    (existingCams || []).map((cam) => [
      `${normalizeText(cam.site)}:${normalizeText(cam.username)}`,
      cam,
    ]),
  );
  return (updatedCams || []).map((cam) => {
    const key = `${normalizeText(cam.site)}:${normalizeText(cam.username)}`;
    const existing = existingMap.get(key);
    if (!existing) return cam;
    return {
      ...cam,
      online: Boolean(existing.online),
      viewMs: Number.isFinite(existing.viewMs) ? existing.viewMs : 0,
      lastViewedAt: Number.isFinite(existing.lastViewedAt) ? existing.lastViewedAt : null,
      viewHistory: Array.isArray(existing.viewHistory) ? existing.viewHistory : [],
    };
  });
}

function showError(message) {
  formError.textContent = message;
  formError.classList.remove("hidden");
}

function clearError() {
  formError.classList.add("hidden");
  formError.textContent = "";
}

function getSelectedFolder() {
  const value = folderSelect ? folderSelect.value : "";
  if (value === "__new__") {
    return folderInput.value.trim();
  }
  return (value || "").trim();
}

if (folderSelect) {
  folderSelect.addEventListener("change", () => {
    if (folderSelect.value === "__new__") {
      folderInput.classList.remove("hidden");
      folderInput.focus();
    } else {
      folderInput.classList.add("hidden");
      folderInput.value = "";
    }
  });
}

addCamButton.addEventListener("click", () => {
  camRows.appendChild(createRow({ type: "cam", values: {} }));
});

addSocialButton.addEventListener("click", () => {
  socialRows.appendChild(createRow({ type: "social", values: {} }));
});
attachSelect.addEventListener("change", handleAttachChange);

addButton.addEventListener("click", addFromCurrentTab);
backButton.addEventListener("click", showListView);
if (folderManagerButton) {
  folderManagerButton.addEventListener("click", showFolderView);
}
if (folderBackButton) {
  folderBackButton.addEventListener("click", showListView);
}
if (settingsToggle) {
  settingsToggle.addEventListener("click", toggleSettingsView);
}
cancelButton.addEventListener("click", () => {
  if (lastView === "detail" && currentProfile) {
    showDetailView(currentProfile);
  } else {
    showListView();
  }
});
detailBackButton.addEventListener("click", showListView);
detailPinButton.addEventListener("click", async () => {
  if (!currentProfile) return;
  const profiles = await getProfiles();
  const updated = profiles.map((item) =>
    item.id === currentProfile.id ? { ...item, pinned: !item.pinned } : item,
  );
  await saveProfiles(updated);
  const refreshed = updated.find((item) => item.id === currentProfile.id);
  if (refreshed) showDetailView(refreshed);
});
detailEditButton.addEventListener("click", () => {
  if (!currentProfile) return;
  openEditor(currentProfile, null, "detail");
});
deleteButton.addEventListener("click", async () => {
  if (!editingId) return;
  const name = (currentProfile && currentProfile.name) || "this bookmark";
  const confirmed = await showConfirm({
    titleText: "Delete bookmark",
    messageText: `Delete ${name}? This cannot be undone.`,
  });
  if (!confirmed) return;
  const updated = (await getProfiles()).filter((item) => item.id !== editingId);
  await saveProfiles(updated);
  editingId = null;
  currentProfile = null;
  showListView();
});
searchInput.addEventListener("input", renderList);
if (onlineFilter) {
  onlineFilter.addEventListener("change", async () => {
    await saveOnlinePreference(onlineFilter.checked);
    renderList();
  });
}
sortSelect.addEventListener("change", async () => {
  await saveSortPreference(sortSelect.value);
  renderList();
});
if (folderFilter) {
  folderFilter.addEventListener("change", async () => {
    preferredFolderFilter = folderFilter.value || "";
    await saveFolderPreference(preferredFolderFilter);
    renderList();
  });
}
if (searchSort && searchInput) {
  const searchToggle = searchSort.querySelector(".search-toggle");
  const activateSearch = () => searchSort.classList.add("search-active");
  const deactivateSearch = () => {
    if (document.activeElement === searchInput) return;
    searchSort.classList.remove("search-active");
  };
  if (searchToggle) {
    searchToggle.addEventListener("mouseenter", activateSearch);
  }
  searchInput.addEventListener("mouseenter", activateSearch);
  searchInput.addEventListener("focus", activateSearch);
  searchInput.addEventListener("blur", deactivateSearch);
  searchSort.addEventListener("mouseleave", deactivateSearch);
}

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();

  const cams = sanitizeCams(collectCams());
  if (!cams.length) {
    showError("Add at least one cam username.");
    return;
  }

  const socials = sanitizeSocials(collectSocials());

  const folder = getSelectedFolder();
  const profile = sanitizeProfile({
    id: editingId || createId(),
    name: nameInput.value.trim(),
    cams,
    socials,
    tags: splitTags(tagsInput.value),
    folder,
    notes: notesInput.value.trim(),
    updatedAt: Date.now(),
  });

  const profiles = await getProfiles();
  let updated = profiles.slice();
  const selectedAttachId = attachField.classList.contains("hidden")
    ? null
    : attachSelect.value || null;

  if (editingId) {
    updated = updated.map((item) => {
      if (item.id !== editingId) return item;
      const mergedCams = mergeCamStats(item.cams || [], profile.cams || []);
      return sanitizeProfile({
        ...item,
        ...profile,
        id: item.id,
        cams: mergedCams,
        pinned: item.pinned,
        createdAt: item.createdAt,
        updatedAt: Date.now(),
      });
    });
  } else if (selectedAttachId) {
    updated = updated.map((item) => {
      if (item.id !== selectedAttachId) return item;
      return mergeProfiles(item, profile);
    });
    attachTargetId = selectedAttachId;
  } else {
    const duplicate = findDuplicateProfile(updated, profile, null);
    if (duplicate) {
      updated = updated.map((item) =>
        item.id === duplicate.id ? mergeProfiles(item, profile) : item,
      );
    } else {
      updated.push(profile);
    }
  }

  await saveProfiles(updated);
  const targetId = editingId || attachTargetId || profile.id;
  const savedProfile = updated.find((item) => item.id === targetId) || profile;
  showDetailView(savedProfile);
});

async function getActiveTab() {
  if (!chrome.tabs?.query) return null;
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs?.[0] || null);
    });
  });
}

async function showInitialView() {
  const profiles = await getProfiles();
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
          normalizeText(normalizeHandle(social.handle)) === socialParsed.handle,
      ),
    );
    if (socialMatch) {
      showDetailView(socialMatch);
      return;
    }
  }
  showListView();
}

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([loadSocialIcons(), loadPlatformIcons()]);
  await loadListPreferences();
  if (initialTab === "settings" || isEmbedded) {
    showSettingsView();
    return;
  }
  chrome.runtime.sendMessage({ type: "online-check" });
  showInitialView();
});
function normalizeHandle(value) {
  return (value || "").trim().replace(/^@/, "").replace(/\/+$/, "");
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  const settings = changes?.camkeeper_settings_v1?.newValue;
  if (!settings) return;
  const onlineChecksEnabled =
    typeof settings.onlineChecksEnabled === "boolean" ? settings.onlineChecksEnabled : true;
  const onlineToggle = onlineFilter?.closest(".filter-toggle");
  if (onlineToggle) {
    onlineToggle.classList.toggle("hidden", !onlineChecksEnabled);
  }
  if (onlineFilter) {
    if (onlineChecksEnabled) {
      onlineFilter.checked = Boolean(settings.onlineOnly);
    } else if (onlineFilter.checked) {
      onlineFilter.checked = false;
      renderList();
    }
  }
});
