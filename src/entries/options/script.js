import SITES, { SITE_KEYS } from "../../config/sites.js";
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

const SETTINGS_KEY = "camkeeper_settings_v1";
const DEFAULT_VISIT_DELAY_MS = 20 * 1000;
const DEFAULT_VISIT_COOLDOWN_MS = 10 * 60 * 1000;

const profileList = document.getElementById("profile-list");
const searchInput = document.getElementById("search-input");
const sortSelect = document.getElementById("sort-select");
const emptyState = document.getElementById("empty-state");
const countEl = document.getElementById("count");
const formTitle = document.getElementById("form-title");
const formError = document.getElementById("form-error");
const profileForm = document.getElementById("profile-form");
const formPanel = document.getElementById("form-panel");
const nameInput = document.getElementById("name-input");
const tagsInput = document.getElementById("tags-input");
const notesInput = document.getElementById("notes-input");
const platformRows = document.getElementById("platform-rows");
const socialRows = document.getElementById("social-rows");
const addPlatformButton = document.getElementById("add-platform");
const addSocialButton = document.getElementById("add-social");
const resetButton = document.getElementById("reset-button");
const newProfileButton = document.getElementById("new-profile");
const exportButton = document.getElementById("export-button");
const importInput = document.getElementById("import-input");
const visitDelayInput = document.getElementById("visit-delay");
const visitCooldownInput = document.getElementById("visit-cooldown");
const visitSaveButton = document.getElementById("visit-save");
const bulkBar = document.getElementById("bulk-bar");
const bulkCount = document.getElementById("bulk-count");
const bulkMerge = document.getElementById("bulk-merge");
const bulkDelete = document.getElementById("bulk-delete");
const bulkCancel = document.getElementById("bulk-cancel");
const selectButton = document.getElementById("select-button");

let editingId = null;
const showConfirm = initConfirmModal();
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
    renderList();
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

function populateForm(profile, seedPlatforms) {
  formTitle.textContent = profile ? "Edit bookmark" : "New bookmark";
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
  (profile?.socials || []).forEach((social) => {
    socialRows.appendChild(createRow({ type: "social", values: social }));
  });
}

function showFormPanel() {
  formPanel.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function hideFormPanel() {
  formPanel.classList.add("hidden");
  document.body.classList.remove("modal-open");
}


async function renderList() {
  const profiles = await loadProfiles();
  const query = normalizeText(searchInput.value);
  const filtered = profiles.filter((profile) => matchQuery(profile, query));
  const sorted = sortBySelection(filtered, sortSelect.value);

  profileList.innerHTML = "";
  emptyState.classList.toggle("hidden", sorted.length > 0);
  emptyState.textContent = query ? "No matches found." : "No bookmarks yet.";
  countEl.textContent = `${sorted.length} bookmark${sorted.length === 1 ? "" : "s"}`;

  sorted.forEach((profile) => {
    const card = document.createElement("li");
    card.classList.add("card");
    if (selection.isActive()) card.classList.add("selectable");

    const main = document.createElement("div");
    main.classList.add("card-main");
    const title = document.createElement("h3");
    title.textContent = profile.name || "Unnamed";
    const titleRow = document.createElement("div");
    titleRow.classList.add("card-title");
    titleRow.appendChild(title);

    const tagChips = document.createElement("div");
    tagChips.classList.add("chips", "title-tags");
    (profile.tags || []).forEach((tag) => {
      const chip = document.createElement("span");
      chip.classList.add("chip");
      chip.textContent = tag;
      tagChips.appendChild(chip);
    });
    if ((profile.tags || []).length) {
      titleRow.appendChild(tagChips);
    }

    const chips = document.createElement("div");
    chips.classList.add("chips");
    profile.platforms.forEach((platform) => {
      const site = SITES[platform.site];
      if (!site) return;
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
      label.textContent = platform.username;

      chip.appendChild(icon);
      chip.appendChild(label);
      chips.appendChild(chip);
    });

    main.appendChild(titleRow);
    main.appendChild(chips);

    card.appendChild(main);

    if (selection.isActive()) {
      if (selection.isSelected(profile.id)) {
        card.classList.add("selected");
      }
      card.addEventListener("click", () => selection.toggleSelection(profile.id));
    } else {
      const actions = document.createElement("div");
      actions.classList.add("card-actions");

      const editButton = document.createElement("button");
      editButton.textContent = "Edit";
      editButton.addEventListener("click", () => {
        editingId = profile.id;
        populateForm(profile);
        clearError();
        showFormPanel();
      });

      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Delete";
      deleteButton.classList.add("danger");
      deleteButton.addEventListener("click", async () => {
        const name = profile.name || "this bookmark";
        const confirmed = await showConfirm({
          titleText: "Delete bookmark",
          messageText: `Delete ${name}? This cannot be undone.`,
        });
        if (!confirmed) return;
        const updated = (await loadProfiles()).filter((item) => item.id !== profile.id);
        await saveProfiles(updated);
        renderList();
        if (editingId === profile.id) resetForm();
      });

      actions.appendChild(editButton);
      actions.appendChild(deleteButton);

      card.appendChild(actions);
    }
    profileList.appendChild(card);
  });
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

function resetForm() {
  editingId = null;
  populateForm(null, []);
  clearError();
  hideFormPanel();
  selection.setSelectMode(false);
}

addPlatformButton.addEventListener("click", () => {
  platformRows.appendChild(createRow({ type: "platform", values: {} }));
});

addSocialButton.addEventListener("click", () => {
  socialRows.appendChild(createRow({ type: "social", values: {} }));
});

resetButton.addEventListener("click", resetForm);
newProfileButton.addEventListener("click", () => {
  resetForm();
  showFormPanel();
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
  renderList();
  resetForm();
  hideFormPanel();
});

exportButton.addEventListener("click", async () => {
  const profiles = await loadProfiles();
  const data = JSON.stringify(profiles, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "camkeeper-bookmarks.json";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
});

importInput.addEventListener("change", async (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error("Invalid data");
    const imported = data.map((item) => sanitizeProfile(item));
    await saveProfiles(imported);
    renderList();
    resetForm();
  } catch (error) {
    showError("Import failed. Please provide a valid JSON export.");
  } finally {
    event.target.value = "";
  }
});

async function loadSettings() {
  const data = await new Promise((resolve) => {
    chrome.storage.local.get(SETTINGS_KEY, (res) => resolve(res));
  });
  const settings = data[SETTINGS_KEY] || {};
  const delayMs = Number.isFinite(settings.visitDelayMs)
    ? settings.visitDelayMs
    : DEFAULT_VISIT_DELAY_MS;
  const cooldownMs = Number.isFinite(settings.visitCooldownMs)
    ? settings.visitCooldownMs
    : DEFAULT_VISIT_COOLDOWN_MS;
  visitDelayInput.value = Math.round(delayMs / 1000);
  visitCooldownInput.value = Math.round(cooldownMs / 60000);
}

async function saveSettings() {
  const delaySeconds = Math.max(5, Number(visitDelayInput.value) || 20);
  const cooldownMinutes = Math.max(1, Number(visitCooldownInput.value) || 10);
  const settings = {
    visitDelayMs: delaySeconds * 1000,
    visitCooldownMs: cooldownMinutes * 60 * 1000,
  };
  await new Promise((resolve) => {
    chrome.storage.local.set({ [SETTINGS_KEY]: settings }, resolve);
  });
}

visitSaveButton.addEventListener("click", async () => {
  await saveSettings();
  await loadSettings();
});

document.addEventListener("DOMContentLoaded", () => {
  resetForm();
  renderList();
  loadSettings();
});
