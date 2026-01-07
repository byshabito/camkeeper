import SITES, { SITE_KEYS } from "../../config/sites.js";
import { parseUrl } from "../../utils/ParseSiteUrls.js";
import {
  SOCIAL_OPTIONS,
  createId,
  findDuplicateProfile,
  loadProfiles,
  matchQuery,
  mergeProfiles,
  normalizeText,
  sanitizePlatforms,
  sanitizeProfile,
  sanitizeSocials,
  saveProfiles,
  splitTags,
} from "../../lib/storage.js";
import { createBulkSelection } from "../../lib/bulkSelection.js";
import { initConfirmModal } from "../../lib/confirmModal.js";
import { sortBySelection } from "../../lib/sort.js";

const listView = document.getElementById("list-view");
const formView = document.getElementById("form-view");
const detailView = document.getElementById("detail-view");
const profileList = document.getElementById("profile-list");
const searchInput = document.getElementById("search-input");
const sortSelect = document.getElementById("sort-select");
const emptyState = document.getElementById("empty-state");
const selectButton = document.getElementById("select-button");
const addButton = document.getElementById("add-button");
const backButton = document.getElementById("back-button");
const cancelButton = document.getElementById("cancel-button");
const deleteButton = document.getElementById("delete-button");
const detailBackButton = document.getElementById("detail-back");
const detailEditButton = document.getElementById("detail-edit");
const formTitle = document.getElementById("form-title");
const formError = document.getElementById("form-error");
const profileForm = document.getElementById("profile-form");
const attachField = document.getElementById("attach-field");
const attachSelect = document.getElementById("attach-select");
const nameInput = document.getElementById("name-input");
const tagsInput = document.getElementById("tags-input");
const notesInput = document.getElementById("notes-input");
const platformRows = document.getElementById("platform-rows");
const socialRows = document.getElementById("social-rows");
const addPlatformButton = document.getElementById("add-platform");
const addSocialButton = document.getElementById("add-social");
const detailTitle = document.getElementById("detail-title");
const detailName = document.getElementById("detail-name");
const detailMeta = document.getElementById("detail-meta");
const detailPlatforms = document.getElementById("detail-platforms");
const detailSocials = document.getElementById("detail-socials");
const detailTags = document.getElementById("detail-tags");
const detailNotes = document.getElementById("detail-notes");
const bulkBar = document.getElementById("bulk-bar");
const bulkCount = document.getElementById("bulk-count");
const bulkMerge = document.getElementById("bulk-merge");
const bulkDelete = document.getElementById("bulk-delete");
const bulkCancel = document.getElementById("bulk-cancel");
const showConfirm = initConfirmModal();

let editingId = null;
let currentProfile = null;
let lastView = "list";
let attachTargetId = null;
let attachProfiles = [];
let attachSeedPlatforms = [];
const selection = createBulkSelection({
  bulkBar,
  bulkCount,
  bulkMerge,
  bulkDelete,
  bulkCancel,
  selectButton,
  onMerge: async (ids) => {
    if (ids.length < 2) return;
    const profiles = await loadProfiles();
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
    const profiles = await loadProfiles();
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

function showListView() {
  listView.classList.remove("hidden");
  formView.classList.add("hidden");
  detailView.classList.add("hidden");
  formError.classList.add("hidden");
  selection.setSelectMode(false);
  renderList();
  lastView = "list";
}

function showFormView(title) {
  formTitle.textContent = title;
  listView.classList.add("hidden");
  detailView.classList.add("hidden");
  formView.classList.remove("hidden");
  deleteButton.classList.toggle("hidden", !editingId);
  if (editingId) {
    attachField.classList.add("hidden");
    attachSelect.innerHTML = "";
    attachTargetId = null;
  } else {
    setAttachOptions(attachProfiles, attachSeedPlatforms);
  }
}

function showDetailView(profile) {
  currentProfile = profile;
  detailTitle.textContent = "Bookmark";
  detailName.textContent = profile.name || "Unnamed";
  detailMeta.textContent = `Updated ${new Date(profile.updatedAt || Date.now()).toLocaleDateString()}`;

  detailPlatforms.innerHTML = "";
  profile.platforms.forEach((platform) => {
    const site = SITES[platform.site];
    if (!site) return;
    const link = document.createElement("a");
    link.href = site.url(platform.username);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.classList.add("platform-link");

    const chip = document.createElement("span");
    chip.classList.add("platform-chip");
    chip.style.borderColor = site.color;
    chip.style.background = site.color;

    const icon = document.createElement("span");
    icon.classList.add("icon");
    icon.style.background = "#ffffff";
    icon.style.color = site.color;
    icon.textContent = site.abbr;

    const label = document.createElement("span");
    label.classList.add("username");
    const count = Number.isFinite(platform.visitCount) ? platform.visitCount : 0;
    label.textContent = `${platform.username} · ${count}`;

    chip.appendChild(icon);
    chip.appendChild(label);
    link.appendChild(chip);
    detailPlatforms.appendChild(link);
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

  detailNotes.textContent = profile.notes || "";

  listView.classList.add("hidden");
  formView.classList.add("hidden");
  detailView.classList.remove("hidden");
  lastView = "detail";
}

function buildSocialUrl(social) {
  const handle = (social.handle || "").trim();
  if (!handle) return null;

  if (/^https?:\/\//i.test(handle)) return handle;

  const normalized = handle.replace(/^@/, "");
  const platform = normalizeText(social.platform);

  switch (platform) {
    case "instagram":
      return `https://instagram.com/${normalized}`;
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
  if (key === "website" || key === "other") return ICONS.link;

  switch (key) {
    case "instagram":
      return ICONS.instagram;
    case "x":
      return ICONS.x;
    case "onlyfans":
      return ICONS.onlyfans;
    case "tiktok":
      return ICONS.tiktok;
    case "reddit":
      return ICONS.reddit;
    default:
      return ICONS.link;
  }
}

const ICONS = {
  instagram:
    '<svg fill="currentColor" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077"/></svg>',
  x: '<svg fill="currentColor" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z"/></svg>',
  onlyfans:
    '<svg fill="currentColor" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M24 4.003h-4.015c-3.45 0-5.3.197-6.748 1.957a7.996 7.996 0 1 0 2.103 9.211c3.182-.231 5.39-2.134 6.085-5.173 0 0-2.399.585-4.43 0 4.018-.777 6.333-3.037 7.005-5.995zM5.61 11.999A2.391 2.391 0 0 1 9.28 9.97a2.966 2.966 0 0 1 2.998-2.528h.008c-.92 1.778-1.407 3.352-1.998 5.263A2.392 2.392 0 0 1 5.61 12Zm2.386-7.996a7.996 7.996 0 1 0 7.996 7.996 7.996 7.996 0 0 0-7.996-7.996Zm0 10.394A2.399 2.399 0 1 1 10.395 12a2.396 2.396 0 0 1-2.399 2.398Z"/></svg>',
  tiktok:
    '<svg fill="currentColor" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>',
  reddit:
    '<svg fill="currentColor" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm4.388 3.199c1.104 0 1.999.895 1.999 1.999 0 1.105-.895 2-1.999 2-.946 0-1.739-.657-1.947-1.539v.002c-1.147.162-2.032 1.15-2.032 2.341v.007c1.776.067 3.4.567 4.686 1.363.473-.363 1.064-.58 1.707-.58 1.547 0 2.802 1.254 2.802 2.802 0 1.117-.655 2.081-1.601 2.531-.088 3.256-3.637 5.876-7.997 5.876-4.361 0-7.905-2.617-7.998-5.87-.954-.447-1.614-1.415-1.614-2.538 0-1.548 1.255-2.802 2.803-2.802.645 0 1.239.218 1.712.585 1.275-.79 2.881-1.291 4.64-1.365v-.01c0-1.663 1.263-3.034 2.88-3.207.188-.911.993-1.595 1.959-1.595Zm-8.085 8.376c-.784 0-1.459.78-1.506 1.797-.047 1.016.64 1.429 1.426 1.429.786 0 1.371-.369 1.418-1.385.047-1.017-.553-1.841-1.338-1.841Zm7.406 0c-.786 0-1.385.824-1.338 1.841.047 1.017.634 1.385 1.418 1.385.785 0 1.473-.413 1.426-1.429-.046-1.017-.721-1.797-1.506-1.797Zm-3.703 4.013c-.974 0-1.907.048-2.77.135-.147.015-.241.168-.183.305.483 1.154 1.622 1.964 2.953 1.964 1.33 0 2.47-.81 2.953-1.964.057-.137-.037-.29-.184-.305-.863-.087-1.795-.135-2.769-.135Z"/></svg>',
  link:
    '<svg class="stroke" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14l4-4"></path><path d="M8 6h-2a4 4 0 0 0 0 8h2"></path><path d="M16 6h2a4 4 0 0 1 0 8h-2"></path></svg>',
};

function clearRows(container) {
  while (container.firstChild) container.removeChild(container.firstChild);
}

function createRow({ type, values }) {
  const row = document.createElement("div");
  row.classList.add("row");

  const select = document.createElement("select");
  if (type === "platform") {
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
  input.placeholder = type === "platform" ? "Username" : "Handle or URL";
  input.value = type === "platform" ? values.username || "" : values.handle || "";
  if (type === "platform") {
    input.addEventListener("blur", () => {
      const parsed = parsePlatformInput(input.value);
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

function parsePlatformInput(value) {
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

function populateForm(profile, seedPlatforms) {
  nameInput.value = profile ? profile.name : "";
  tagsInput.value = profile ? (profile.tags || []).join(", ") : "";
  notesInput.value = profile ? profile.notes || "" : "";

  clearRows(platformRows);
  const platforms = profile?.platforms?.length
    ? profile.platforms
    : seedPlatforms?.length
      ? seedPlatforms
      : [{ site: SITE_KEYS[0], username: "" }];
  platforms.forEach((platform) => {
    platformRows.appendChild(createRow({ type: "platform", values: platform }));
  });

  clearRows(socialRows);
  const socials = profile?.socials?.length ? profile.socials : [{}];
  socials.forEach((social) => {
    socialRows.appendChild(createRow({ type: "social", values: social }));
  });
}

function setAttachOptions(profiles, seedPlatforms) {
  attachTargetId = null;
  attachSelect.innerHTML = "";

  if (editingId || !seedPlatforms?.length || !profiles.length) {
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
    populateForm(null, attachSeedPlatforms);
    return;
  }

  const target = attachProfiles.find((profile) => profile.id === selectedId);
  if (!target) return;

  const mergedPlatforms = sanitizePlatforms([
    ...(target.platforms || []),
    ...(attachSeedPlatforms || []),
  ]);

  populateForm(
    {
      ...target,
      platforms: mergedPlatforms,
    },
    mergedPlatforms,
  );
}

async function renderList() {
  const profiles = await loadProfiles();
  const query = normalizeText(searchInput.value);
  const filtered = profiles.filter((profile) => matchQuery(profile, query));
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

    const platformChips = document.createElement("div");
    platformChips.classList.add("chips");
    profile.platforms.forEach((platform) => {
      const site = SITES[platform.site];
      if (!site) return;
      const link = document.createElement("a");
      link.href = site.url(platform.username);
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
      chip.style.borderColor = site.color;
      chip.style.background = site.color;

      const icon = document.createElement("span");
      icon.classList.add("icon");
      icon.style.background = "#ffffff";
      icon.style.color = site.color;
      icon.textContent = site.abbr;

      const label = document.createElement("span");
      label.classList.add("username");
      label.textContent = `${platform.username}`;

      chip.appendChild(icon);
      chip.appendChild(label);
      link.appendChild(chip);
      platformChips.appendChild(link);
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
    main.appendChild(platformChips);
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

function openEditor(profile, seedPlatforms, source = "list", profiles = []) {
  editingId = profile ? profile.id : null;
  currentProfile = profile || null;
  lastView = source;
  attachProfiles = profiles || [];
  attachSeedPlatforms = seedPlatforms || [];
  populateForm(profile, seedPlatforms);
  showFormView(profile ? "Edit bookmark" : "New bookmark");
}

async function addFromCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const parsed = tab?.url ? parseUrl(tab.url) : null;
  const seedPlatforms = parsed ? [{ site: parsed.site, username: parsed.username }] : [];
  if (!seedPlatforms.length) {
    openEditor(null, [], "list", await loadProfiles());
    return;
  }

  const profiles = await loadProfiles();
  const duplicate = findDuplicateProfile(profiles, { platforms: seedPlatforms }, null);
  if (duplicate) {
    openEditor(duplicate, null, "detail");
  } else {
    openEditor(null, seedPlatforms, "list", profiles);
  }
}

function collectPlatforms() {
  const rows = Array.from(platformRows.querySelectorAll(".row"));
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

function showError(message) {
  formError.textContent = message;
  formError.classList.remove("hidden");
}

function clearError() {
  formError.classList.add("hidden");
  formError.textContent = "";
}

addPlatformButton.addEventListener("click", () => {
  platformRows.appendChild(createRow({ type: "platform", values: {} }));
});

addSocialButton.addEventListener("click", () => {
  socialRows.appendChild(createRow({ type: "social", values: {} }));
});
attachSelect.addEventListener("change", handleAttachChange);

addButton.addEventListener("click", addFromCurrentTab);
backButton.addEventListener("click", showListView);
cancelButton.addEventListener("click", () => {
  if (lastView === "detail" && currentProfile) {
    showDetailView(currentProfile);
  } else {
    showListView();
  }
});
detailBackButton.addEventListener("click", showListView);
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
  const updated = (await loadProfiles()).filter((item) => item.id !== editingId);
  await saveProfiles(updated);
  editingId = null;
  currentProfile = null;
  showListView();
});
searchInput.addEventListener("input", renderList);
sortSelect.addEventListener("change", renderList);

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();

  const platforms = sanitizePlatforms(collectPlatforms());
  if (!platforms.length) {
    showError("Add at least one platform username.");
    return;
  }

  const socials = sanitizeSocials(collectSocials());

  const profile = sanitizeProfile({
    id: editingId || createId(),
    name: nameInput.value.trim(),
    platforms,
    socials,
    tags: splitTags(tagsInput.value),
    notes: notesInput.value.trim(),
    updatedAt: Date.now(),
  });

  const profiles = await loadProfiles();
  let updated = profiles.slice();
  const selectedAttachId = attachField.classList.contains("hidden")
    ? null
    : attachSelect.value || null;

  if (editingId) {
    updated = updated.map((item) => {
      if (item.id !== editingId) return item;
      return sanitizeProfile({
        ...item,
        ...profile,
        id: item.id,
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

async function showInitialView() {
  const profiles = await loadProfiles();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const parsed = tab?.url ? parseUrl(tab.url) : null;
  if (parsed) {
    const match = findDuplicateProfile(
      profiles,
      { platforms: [{ site: parsed.site, username: parsed.username }] },
      null,
    );
    if (match) {
      showDetailView(match);
      return;
    }
  }
  showListView();
}

document.addEventListener("DOMContentLoaded", () => {
  showInitialView();
});
