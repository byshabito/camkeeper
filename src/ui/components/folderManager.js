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

export function renderFolderManager({
  folders,
  elements,
  onRename,
  onDelete,
  onReorder,
}) {
  const { folderList, folderEmpty } = elements;
  clearContainer(folderList);
  folderEmpty.classList.toggle("hidden", folders.length > 0);

  folders.forEach((folder) => {
    const row = document.createElement("div");
    row.classList.add("folder-row");
    row.dataset.folderKey = folder.key;

    const dragHandle = document.createElement("div");
    dragHandle.classList.add("folder-drag-handle");
    dragHandle.setAttribute("aria-hidden", "true");
    dragHandle.draggable = true;
    applySvg(
      dragHandle,
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-grip-vertical-icon lucide-grip-vertical"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>',
    );

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
