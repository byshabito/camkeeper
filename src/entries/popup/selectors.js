import { sortBySelection } from "../../lib/sort.js";
import { matchQuery } from "../../lib/domain/profiles.js";
import { sanitizeCams } from "../../lib/domain/sanitizers.js";
import { normalizeWebsiteHandle } from "../../lib/domain/urls.js";
import { normalizeText } from "../../lib/domain/text.js";

export function normalizeFolderKey(folderName) {
  return normalizeText(folderName);
}

export function orderFolderNames(names, preferredOrder) {
  const order = Array.isArray(preferredOrder) ? preferredOrder : [];
  const folderMap = new Map(
    names.map((name) => [normalizeFolderKey(name), name]),
  );
  const ordered = [];
  order.forEach((key) => {
    const match = folderMap.get(key);
    if (match) {
      ordered.push(match);
      folderMap.delete(key);
    }
  });
  const remaining = Array.from(folderMap.values()).sort((a, b) => a.localeCompare(b));
  return ordered.concat(remaining);
}

export function getFolderOptions(profiles, preferredOrder) {
  const map = new Map();
  profiles.forEach((profile) => {
    const folder = (profile.folder || "").trim();
    if (!folder) return;
    const key = normalizeFolderKey(folder);
    if (!map.has(key)) map.set(key, folder);
  });
  return orderFolderNames(Array.from(map.values()), preferredOrder);
}

export function getFolderStats(profiles, preferredOrder) {
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
  const orderedNames = orderFolderNames(
    Array.from(map.values()).map((entry) => entry.name),
    preferredOrder,
  );
  return orderedNames.map((name) => map.get(normalizeFolderKey(name))).filter(Boolean);
}

export function matchesFolder(profile, selectedFolderKey) {
  if (!selectedFolderKey) return true;
  return normalizeText(profile.folder) === selectedFolderKey;
}

export function selectProfiles(profiles, { query, folderKey, sortKey }) {
  const filtered = profiles.filter(
    (profile) => matchQuery(profile, query) && matchesFolder(profile, folderKey),
  );
  return sortBySelection(filtered, sortKey);
}

export function selectProfileListViewModel(profiles, { query, folderKey, sortKey }) {
  const trimmedQuery = (query || "").trim();
  const sorted = selectProfiles(profiles, { query: trimmedQuery, folderKey, sortKey });
  return {
    profiles: sorted,
    emptyMessage: trimmedQuery ? "No matches found." : "No profiles yet.",
  };
}

export function selectFolderManagerViewModel(profiles, preferredOrder) {
  return {
    folders: getFolderStats(profiles, preferredOrder),
  };
}

export function selectDetailViewModel(profile, { formatDuration, formatSocialHandle, buildSocialUrl }) {
  if (!profile) return null;
  const cams = [...(profile.cams || [])]
    .sort((a, b) => (b.viewMs || 0) - (a.viewMs || 0))
    .map((cam) => ({
      ...cam,
      viewLabel: formatDuration(Number.isFinite(cam.viewMs) ? cam.viewMs : 0),
    }));

  const socials = (profile.socials || []).map((social) => ({
    ...social,
    url: buildSocialUrl(social),
    display: formatSocialHandle(social),
  }));

  return {
    title: "Profile",
    name: profile.name || "Unnamed",
    updatedLabel: `Updated ${new Date(profile.updatedAt || Date.now()).toLocaleDateString()}`,
    pinned: Boolean(profile.pinned),
    folder: profile.folder || "",
    notes: profile.notes || "",
    tags: profile.tags || [],
    cams,
    socials,
  };
}

export function selectFormViewModel({
  profile,
  seedCams,
  profiles,
  editingId,
  defaultSiteKey,
}) {
  const formProfile = profile || {};
  const cams = formProfile?.cams?.length
    ? formProfile.cams
    : seedCams?.length
      ? seedCams
      : [{ site: defaultSiteKey, username: "" }];
  const socials = formProfile?.socials?.length ? formProfile.socials : [{}];

  const canAttach = !editingId && seedCams?.length && profiles?.length;
  const attachOptions = canAttach
    ? [
        { value: "", label: "Create new profile" },
        ...profiles.map((item) => ({
          value: item.id,
          label: item.name || "Unnamed",
        })),
      ]
    : [];

  return {
    form: {
      name: formProfile?.name || "",
      tags: (formProfile?.tags || []).join(", "),
      folder: formProfile?.folder || "",
      notes: formProfile?.notes || "",
      cams,
      socials,
    },
    attachOptions,
  };
}

export function selectAttachFormViewModel({
  selectedId,
  profiles,
  seedCams,
  editingId,
  defaultSiteKey,
}) {
  if (!selectedId) {
    return selectFormViewModel({
      profile: null,
      seedCams,
      profiles,
      editingId,
      defaultSiteKey,
    });
  }
  const target = profiles.find((profile) => profile.id === selectedId);
  if (!target) return null;
  const mergedCams = sanitizeCams([
    ...(target.cams || []),
    ...(seedCams || []),
  ]);
  return selectFormViewModel({
    profile: { ...target, cams: mergedCams },
    seedCams: mergedCams,
    profiles,
    editingId,
    defaultSiteKey,
  });
}

export function selectFolderOptionsViewModel({
  profiles,
  preferredOrder,
  selectedFilter,
  preferredFilter,
  currentFolder,
}) {
  const folders = getFolderOptions(profiles, preferredOrder);
  const folderKeys = folders.map((folder) => normalizeFolderKey(folder));

  const resolveMatch = (value) => {
    if (!value) return "";
    const key = normalizeText(value);
    const index = folderKeys.indexOf(key);
    return index === -1 ? "" : folders[index];
  };

  const resolvedFilter = resolveMatch(selectedFilter) || resolveMatch(preferredFilter);
  const shouldResetFilter = Boolean(preferredFilter && !resolveMatch(preferredFilter));

  const resolvedSelect = resolveMatch(currentFolder);
  const selectValue = resolvedSelect || (currentFolder ? "__new__" : "");
  const showNewFolderInput = Boolean(currentFolder && !resolvedSelect);
  const newFolderValue = showNewFolderInput ? currentFolder : "";

  const selectOptions = [
    { value: "", label: "No folder" },
    ...folders.map((folder) => ({ value: folder, label: folder })),
    { value: "__new__", label: "New folder…" },
  ];

  return {
    filterOptions: [{ value: "", label: "All" }, ...folders.map((folder) => ({
      value: folder,
      label: folder,
    }))],
    filterValue: resolvedFilter || "",
    shouldResetFilter,
    selectOptions,
    selectValue,
    showNewFolderInput,
    newFolderValue,
  };
}

export function truncateText(text, length) {
  const clean = (text || "").trim();
  if (clean.length <= length) return clean;
  return `${clean.slice(0, length - 1)}...`;
}

export function formatDuration(ms) {
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

export function formatSocialHandle(social) {
  const handle = (social.handle || "").trim();
  if (!handle) return "";

  if (normalizeText(social.platform) === "website") {
    return handle.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  }

  return handle;
}

export function normalizeSocialHandle(platform, value) {
  if (normalizeText(platform) === "website") {
    return normalizeWebsiteHandle(value);
  }
  return normalizeText(normalizeHandle(value));
}

function normalizeHandle(value) {
  return (value || "").trim().replace(/^@/, "").replace(/\/+$/, "");
}
