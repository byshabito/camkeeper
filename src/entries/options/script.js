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
  sortProfiles,
  splitTags,
} from "../../lib/storage.js";

const profileList = document.getElementById("profile-list");
const searchInput = document.getElementById("search-input");
const emptyState = document.getElementById("empty-state");
const countEl = document.getElementById("count");
const formTitle = document.getElementById("form-title");
const formError = document.getElementById("form-error");
const profileForm = document.getElementById("profile-form");
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

let editingId = null;

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
  removeButton.textContent = "Remove";
  removeButton.classList.add("ghost");
  removeButton.addEventListener("click", () => row.remove());

  row.appendChild(select);
  row.appendChild(input);
  row.appendChild(removeButton);

  return row;
}

function populateForm(profile, seedPlatforms) {
  formTitle.textContent = profile ? "Edit profile" : "New profile";
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

async function renderList() {
  const profiles = sortProfiles(await loadProfiles());
  const query = normalizeText(searchInput.value);
  const filtered = profiles.filter((profile) => matchQuery(profile, query));

  profileList.innerHTML = "";
  emptyState.classList.toggle("hidden", filtered.length > 0);
  emptyState.textContent = query ? "No matches found." : "No bookmarks yet.";
  countEl.textContent = `${filtered.length} profile${filtered.length === 1 ? "" : "s"}`;

  filtered.forEach((profile) => {
    const card = document.createElement("li");
    card.classList.add("card");

    const main = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = profile.name || "Unnamed";

    const meta = document.createElement("small");
    meta.textContent = `${profile.platforms.length} platform${profile.platforms.length === 1 ? "" : "s"}`;

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

    main.appendChild(title);
    main.appendChild(meta);
    main.appendChild(chips);

    const actions = document.createElement("div");
    actions.classList.add("card-actions");

    const editButton = document.createElement("button");
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => {
      editingId = profile.id;
      populateForm(profile);
      clearError();
    });

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", async () => {
      const updated = (await loadProfiles()).filter((item) => item.id !== profile.id);
      await saveProfiles(updated);
      renderList();
      if (editingId === profile.id) resetForm();
    });

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);

    card.appendChild(main);
    card.appendChild(actions);
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
}

addPlatformButton.addEventListener("click", () => {
  platformRows.appendChild(createRow({ type: "platform", values: {} }));
});

addSocialButton.addEventListener("click", () => {
  socialRows.appendChild(createRow({ type: "social", values: {} }));
});

resetButton.addEventListener("click", resetForm);
newProfileButton.addEventListener("click", resetForm);
searchInput.addEventListener("input", renderList);

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
});

exportButton.addEventListener("click", async () => {
  const profiles = await loadProfiles();
  const data = JSON.stringify(profiles, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "camkeeper-profiles.json";
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

document.addEventListener("DOMContentLoaded", () => {
  resetForm();
  renderList();
});
