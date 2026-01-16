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
  clearContainer(profileList);
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
    applySvg(pinButton, getPinIconSvg(profile.pinned));
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
        if (!applySvg(icon, cam.iconSvg)) icon.textContent = cam.iconText;
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
