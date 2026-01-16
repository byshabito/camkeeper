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

export function renderFolderFilter({ elements, options, value }) {
  const { folderFilter } = elements;
  if (
    !folderFilter ||
    typeof globalThis.document === "undefined" ||
    typeof globalThis.document.createElement !== "function"
  ) {
    return;
  }
  clearContainer(folderFilter);
  options.forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option.value;
    opt.textContent = option.label;
    folderFilter.appendChild(opt);
  });
  folderFilter.value = value;
}
