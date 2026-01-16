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

import { applySvg, clearContainer } from "./domUtils.js";

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
  clearContainer(detailPinButton);
  applySvg(detailPinButton, getPinIconSvg(viewModel.pinned));
  const pinLabel = document.createElement("span");
  pinLabel.textContent = viewModel.pinned ? "Unpin" : "Pin";
  detailPinButton.appendChild(pinLabel);

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
      if (!applySvg(icon, cam.iconSvg)) icon.textContent = cam.iconText;
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
    applySvg(icon, social.iconSvg);

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

  clearContainer(detailFolder);
  if (viewModel.folder) {
    detailFolder.classList.remove("hidden");
    const folderLabel = document.createElement("span");
    folderLabel.textContent = viewModel.folder;
    detailFolder.appendChild(folderLabel);
    applySvg(detailFolder, getFolderIconSvg());
  } else {
    detailFolder.classList.add("hidden");
  }

  detailNotes.textContent = viewModel.notes;
}
