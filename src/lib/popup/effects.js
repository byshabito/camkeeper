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

export function setViewVisibility(views, activeView) {
  const { listView, formView, detailView, folderView, settingsView } = views;
  if (listView) listView.classList.toggle("hidden", activeView !== "list");
  if (formView) formView.classList.toggle("hidden", activeView !== "form");
  if (detailView) detailView.classList.toggle("hidden", activeView !== "detail");
  if (folderView) folderView.classList.toggle("hidden", activeView !== "folder");
  if (settingsView) settingsView.classList.toggle("hidden", activeView !== "settings");
}

export function setSettingsToggleState(
  { settingsToggle, settingsIcon, overviewIcon, isEmbedded },
  mode,
) {
  if (!settingsToggle) return;
  const shouldHide = mode === "hidden" || isEmbedded;
  settingsToggle.classList.toggle("hidden", shouldHide);
  if (shouldHide) return;
  if (settingsIcon) settingsIcon.classList.toggle("hidden", mode !== "settings");
  if (overviewIcon) overviewIcon.classList.toggle("hidden", mode !== "overview");
  const label = mode === "overview" ? "Overview" : "Settings page";
  settingsToggle.setAttribute("aria-label", label);
  settingsToggle.setAttribute("title", label);
}

export function showFormError(formError, message) {
  if (!formError) return;
  formError.textContent = message;
  formError.classList.remove("hidden");
}

export function clearFormError(formError) {
  if (!formError) return;
  formError.classList.add("hidden");
  formError.textContent = "";
}

export function clearContainer(container) {
  if (!container) return;
  while (container.firstChild) container.removeChild(container.firstChild);
}

export function createSearchHoverHandlers({ searchSort, searchInput }) {
  if (!searchSort || !searchInput) return [];
  const activate = () => searchSort.classList.add("search-active");
  const deactivate = () => {
    if (document.activeElement === searchInput) return;
    searchSort.classList.remove("search-active");
  };
  return [
    {
      element: searchSort.querySelector(".search-toggle"),
      event: "mouseenter",
      handler: activate,
    },
    {
      element: searchInput,
      event: "mouseenter",
      handler: activate,
    },
    {
      element: searchInput,
      event: "focus",
      handler: activate,
    },
    {
      element: searchInput,
      event: "blur",
      handler: deactivate,
    },
    {
      element: searchSort,
      event: "mouseleave",
      handler: deactivate,
    },
  ].filter((entry) => entry.element);
}

export function createFolderSelectHandlers({ folderSelect, folderInput }) {
  if (!folderSelect || !folderInput) return [];
  return [
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
  ];
}

export function createListControlHandlers({
  elements,
  onQueryChange,
  onSortChange,
  onFolderFilterChange,
}) {
  const { searchInput, sortSelect, folderFilter } = elements;
  return [
    {
      element: searchInput,
      event: "input",
      handler: (event) => onQueryChange?.(event.target.value),
    },
    {
      element: sortSelect,
      event: "change",
      handler: (event) => onSortChange?.(event.target.value),
    },
    {
      element: folderFilter,
      event: "change",
      handler: (event) => onFolderFilterChange?.(event.target.value),
    },
  ].filter((entry) => entry.element);
}

export function renderProfileDetail({
  viewModel,
  elements,
  getPinIconSvg,
  getFolderIconSvg,
}) {
  if (!viewModel) return;
  const {
    detailTitle,
    detailName,
    detailMeta,
    detailPinButton,
    detailCams,
    detailSocials,
    detailTags,
    detailFolder,
    detailNotes,
  } = elements;

  detailTitle.textContent = viewModel.title;
  detailName.textContent = viewModel.name;
  detailMeta.textContent = viewModel.updatedLabel;
  detailPinButton.classList.add("pin-toggle", "detail-pin");
  detailPinButton.classList.toggle("pinned", viewModel.pinned);
  detailPinButton.title = viewModel.pinned ? "Unpin" : "Pin";
  detailPinButton.setAttribute("aria-label", detailPinButton.title);
  detailPinButton.innerHTML = `${getPinIconSvg(viewModel.pinned)}<span>${
    viewModel.pinned ? "Unpin" : "Pin"
  }</span>`;

  clearContainer(detailCams);
  viewModel.cams.forEach((cam) => {
      const link = document.createElement("a");
      link.href = cam.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.classList.add("platform-link");

      const chip = document.createElement("span");
      chip.classList.add("platform-chip");
      chip.style.setProperty("--platform-color", cam.color);

      const icon = document.createElement("span");
      icon.classList.add("icon");
      icon.style.color = cam.color;
      icon.style.borderColor = "transparent";
      if (cam.iconSvg) {
        icon.innerHTML = cam.iconSvg;
      } else {
        icon.textContent = cam.iconText;
      }

      const label = document.createElement("span");
      label.classList.add("username");
      label.textContent = cam.username;
      chip.title = `Total view time: ${cam.viewLabel}`;

      chip.appendChild(icon);
      chip.appendChild(label);
      link.appendChild(chip);
      detailCams.appendChild(link);
  });

  clearContainer(detailSocials);
  viewModel.socials.forEach((social) => {
    let chipHost = detailSocials;
    if (social.url) {
      const link = document.createElement("a");
      link.href = social.url;
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
    icon.innerHTML = social.iconSvg;

    const text = document.createElement("span");
    text.textContent = social.display;

    chip.appendChild(icon);
    chip.appendChild(text);
    chipHost.appendChild(chip);
  });

  clearContainer(detailTags);
  viewModel.tags.forEach((tag) => {
    const chip = document.createElement("span");
    chip.classList.add("chip");
    chip.textContent = tag;
    detailTags.appendChild(chip);
  });

  detailFolder.innerHTML = "";
  if (viewModel.folder) {
    detailFolder.classList.remove("hidden");
    detailFolder.innerHTML = `<span>${viewModel.folder}</span>${getFolderIconSvg()}`;
  } else {
    detailFolder.classList.add("hidden");
  }

  detailNotes.textContent = viewModel.notes;
}

export function renderProfileList({
  profiles,
  elements,
  selection,
  getPinIconSvg,
  onPinToggle,
  onOpenDetail,
  emptyMessage,
}) {
  const { profileList, emptyState } = elements;
  profileList.innerHTML = "";
  emptyState.classList.toggle("hidden", profiles.length > 0);
  emptyState.textContent = emptyMessage;

  profiles.forEach((profile) => {
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
      await onPinToggle(profile.id);
    });
    card.appendChild(pinButton);

    const camChips = document.createElement("div");
    camChips.classList.add("chips");
    (profile.cams || []).forEach((cam) => {
        const link = document.createElement("a");
        link.href = cam.href;
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
        chip.style.setProperty("--platform-color", cam.color);
        chip.title = cam.title;

        const icon = document.createElement("span");
        icon.classList.add("icon");
        icon.style.color = cam.color;
        icon.style.borderColor = "transparent";
        if (cam.iconSvg) {
          icon.innerHTML = cam.iconSvg;
        } else {
          icon.textContent = cam.iconText;
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
    note.textContent = profile.notePreview || "";

    title.appendChild(name);
    if (profile.tags?.length) title.appendChild(tagChips);

    main.appendChild(title);
    main.appendChild(camChips);
    if (profile.notePreview) main.appendChild(note);

    if (selection.isActive()) {
      if (selection.isSelected(profile.id)) {
        card.classList.add("selected");
      }
      card.addEventListener("click", () => {
        selection.toggleSelection(profile.id);
      });
    } else {
      card.addEventListener("click", () => onOpenDetail(profile.id));
    }

    card.appendChild(main);
    profileList.appendChild(card);
  });
}

export function renderFolderManager({
  folders,
  elements,
  onRename,
  onDelete,
  onReorder,
}) {
  const { folderList, folderEmpty } = elements;
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
      await onReorder(sourceKey, folder.key);
    });

    const meta = document.createElement("div");
    meta.classList.add("folder-row-meta");
    meta.textContent = `${folder.count} profile${folder.count === 1 ? "" : "s"}`;

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
      onRename(folder, nextValue);
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
      await onDelete(folder);
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

export function createFormRow({
  type,
  values,
  siteKeys,
  sites,
  socialOptions,
  parseCamInput,
  parseSocialInput,
}) {
  const row = document.createElement("div");
  row.classList.add("row");

  const select = document.createElement("select");
  if (type === "cam") {
    siteKeys.forEach((siteKey) => {
      const option = document.createElement("option");
      option.value = siteKey;
      option.textContent = sites[siteKey].label;
      select.appendChild(option);
    });
    select.value = values.site || siteKeys[0];
  } else {
    socialOptions.forEach((option) => {
      const opt = document.createElement("option");
      opt.value = option.id;
      opt.textContent = option.label;
      select.appendChild(opt);
    });
    select.value = values.platform || socialOptions[0].id;
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

export function applyFormViewModel({
  viewModel,
  elements,
  createFormRow,
  siteKeys,
  sites,
  socialOptions,
  parseCamInput,
  parseSocialInput,
  selectedAttachId,
}) {
  const {
    nameInput,
    tagsInput,
    folderInput,
    notesInput,
    camRows,
    socialRows,
    attachField,
    attachSelect,
  } = elements;
  const { form, attachOptions } = viewModel;

  nameInput.value = form.name;
  tagsInput.value = form.tags;
  folderInput.value = form.folder;
  notesInput.value = form.notes;

  clearContainer(camRows);
  form.cams.forEach((cam) => {
    camRows.appendChild(
      createFormRow({
        type: "cam",
        values: cam,
        siteKeys,
        sites,
        socialOptions,
        parseCamInput,
        parseSocialInput,
      }),
    );
  });

  clearContainer(socialRows);
  form.socials.forEach((social) => {
    socialRows.appendChild(
      createFormRow({
        type: "social",
        values: social,
        siteKeys,
        sites,
        socialOptions,
        parseCamInput,
        parseSocialInput,
      }),
    );
  });

  if (!attachSelect || !attachField) return;
  attachSelect.innerHTML = "";
  if (!attachOptions.length) {
    attachField.classList.add("hidden");
    return;
  }
  attachOptions.forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option.value;
    opt.textContent = option.label;
    attachSelect.appendChild(opt);
  });
  if (typeof selectedAttachId === "string") {
    attachSelect.value = selectedAttachId;
  }
  attachField.classList.remove("hidden");
}

export function renderFolderFilter({ elements, options, value }) {
  const { folderFilter } = elements;
  if (!folderFilter) return;
  folderFilter.innerHTML = "";
  options.forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option.value;
    opt.textContent = option.label;
    folderFilter.appendChild(opt);
  });
  folderFilter.value = value;
}

export function renderFolderSelect({
  elements,
  options,
  value,
  showNewFolderInput,
  newFolderValue,
}) {
  const { folderSelect, folderInput } = elements;
  if (!folderSelect) return;
  folderSelect.innerHTML = "";
  options.forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option.value;
    opt.textContent = option.label;
    folderSelect.appendChild(opt);
  });
  folderSelect.value = value;
  if (showNewFolderInput) {
    folderInput.value = newFolderValue;
    folderInput.classList.remove("hidden");
  } else {
    folderInput.value = "";
    folderInput.classList.add("hidden");
  }
}

export function getFormData({ elements }) {
  const {
    nameInput,
    tagsInput,
    folderSelect,
    folderInput,
    notesInput,
    camRows,
    socialRows,
  } = elements;

  const cams = Array.from(camRows.querySelectorAll(".row")).map((row) => {
    const select = row.querySelector("select");
    const input = row.querySelector("input");
    return {
      site: select.value,
      username: input.value,
    };
  });

  const socials = Array.from(socialRows.querySelectorAll(".row")).map((row) => {
    const select = row.querySelector("select");
    const input = row.querySelector("input");
    return {
      platform: select.value,
      handle: input.value,
    };
  });

  let folder = (folderSelect?.value || "").trim();
  if (folder === "__new__") {
    folder = folderInput.value.trim();
  }

  return {
    name: nameInput.value,
    tags: tagsInput.value,
    folder,
    notes: notesInput.value,
    cams,
    socials,
  };
}

export function getAttachSelection({ attachField, attachSelect }) {
  if (!attachField || !attachSelect) return null;
  if (attachField.classList.contains("hidden")) return null;
  return attachSelect.value || null;
}
