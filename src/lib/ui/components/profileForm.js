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

import { clearContainer } from "./domUtils.js";

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
  clearContainer(attachSelect);
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

export function renderFolderSelect({
  elements,
  options,
  value,
  showNewFolderInput,
  newFolderValue,
}) {
  const { folderSelect, folderInput } = elements;
  if (!folderSelect) return;
  clearContainer(folderSelect);
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
