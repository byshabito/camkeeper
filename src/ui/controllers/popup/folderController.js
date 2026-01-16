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

import { renderFolderManager } from "../../components/folderManager.js";
import { renderFolderFilter } from "../../components/listControls.js";
import { renderFolderSelect } from "../../components/profileForm.js";

export function createFolderController({
  state,
  dialogs,
  folderFilter,
  folderSelect,
  folderInput,
  folderList,
  folderEmpty,
  fetchProfiles,
  persistProfiles,
  saveFolderOrderPreference,
  handleFolderFilterChange,
  normalizeText,
  selectFolderOptionsViewModel,
  selectFolderManagerViewModel,
}) {
  let renderFolderToken = 0;

  function updateFolderOptions(profiles, currentFolder) {
    if (
      !folderFilter ||
      !folderSelect ||
      !folderInput ||
      typeof globalThis.document === "undefined" ||
      typeof globalThis.document.createElement !== "function"
    ) {
      return;
    }
    const preferredFolderOrder = state.getValue("preferredFolderOrder");
    const preferredFolderFilter = state.getValue("preferredFolderFilter");
    const listFolderFilter = state.getValue("listFolderFilter");
    const viewModel = selectFolderOptionsViewModel({
      profiles,
      preferredOrder: preferredFolderOrder,
      selectedFilter: listFolderFilter,
      preferredFilter: preferredFolderFilter,
      currentFolder,
    });
    renderFolderFilter({
      elements: { folderFilter },
      options: viewModel.filterOptions,
      value: viewModel.filterValue,
    });
    renderFolderSelect({
      elements: { folderSelect, folderInput },
      options: viewModel.selectOptions,
      value: viewModel.selectValue,
      showNewFolderInput: viewModel.showNewFolderInput,
      newFolderValue: viewModel.newFolderValue,
    });
    state.setValue("listFolderFilter", viewModel.filterValue);
    if (viewModel.shouldResetFilter) {
      state.setValue("preferredFolderFilter", "");
      handleFolderFilterChange("");
    }
  }

  async function renameFolder(folderName, nextName) {
    const trimmed = (nextName || "").trim();
    if (!trimmed) return;
    const currentKey = normalizeText(folderName);
    const nextKey = normalizeText(trimmed);
    const profiles = await fetchProfiles();
    const updated = profiles.map((profile) => {
      const folderKey = normalizeText(profile.folder);
      if (!folderKey) return profile;
      if (folderKey !== currentKey && folderKey !== nextKey) return profile;
      return {
        ...profile,
        folder: trimmed,
        updatedAt: Date.now(),
      };
    });
    await persistProfiles(updated);
    if (currentKey !== nextKey) {
      const currentOrder = state.getValue("preferredFolderOrder");
      const nextOrder = currentOrder.map((key) => (key === currentKey ? nextKey : key));
      const updatedOrder = Array.from(new Set(nextOrder));
      state.setValue("preferredFolderOrder", updatedOrder);
      await saveFolderOrderPreference(updatedOrder);
    }
    updateFolderOptions(updated, trimmed);
    await renderFolderManagerView(updated);
  }

  async function deleteFolder(folderName) {
    const currentKey = normalizeText(folderName);
    const profiles = await fetchProfiles();
    const updated = profiles.map((profile) => {
      const folderKey = normalizeText(profile.folder);
      if (!folderKey || folderKey !== currentKey) return profile;
      return {
        ...profile,
        folder: "",
        updatedAt: Date.now(),
      };
    });
    await persistProfiles(updated);
    const currentOrder = state.getValue("preferredFolderOrder");
    const nextOrder = currentOrder.filter((key) => key !== currentKey);
    if (nextOrder.length !== currentOrder.length) {
      state.setValue("preferredFolderOrder", nextOrder);
      await saveFolderOrderPreference(nextOrder);
    }
    updateFolderOptions(updated);
    await renderFolderManagerView(updated);
  }

  async function handleFolderReorder(sourceKey, targetKey) {
    if (!folderList || !sourceKey || !targetKey || sourceKey === targetKey) return;
    const order = Array.from(folderList.querySelectorAll(".folder-row"))
      .map((row) => row.dataset.folderKey)
      .filter(Boolean);
    const sourceIndex = order.indexOf(sourceKey);
    const targetIndex = order.indexOf(targetKey);
    if (sourceIndex === -1 || targetIndex === -1) return;
    order.splice(sourceIndex, 1);
    order.splice(targetIndex, 0, sourceKey);
    state.setValue("preferredFolderOrder", order);
    await saveFolderOrderPreference(order);
    const profiles = await fetchProfiles();
    updateFolderOptions(profiles);
    await renderFolderManagerView(profiles);
  }

  async function renderFolderManagerView(prefetchedProfiles = null) {
    if (!folderList) return;
    const token = ++renderFolderToken;
    const profiles = prefetchedProfiles || (await fetchProfiles());
    if (token !== renderFolderToken) return;
    const viewModel = selectFolderManagerViewModel(
      profiles,
      state.getValue("preferredFolderOrder"),
    );
    if (token !== renderFolderToken) return;
    renderFolderManager({
      folders: viewModel.folders,
      elements: { folderList, folderEmpty },
      onRename: (folder, nextValue) => {
        if (normalizeText(nextValue) === normalizeText(folder.name)) {
          if (nextValue !== folder.name) renameFolder(folder.name, nextValue);
          return;
        }
        renameFolder(folder.name, nextValue);
      },
      onDelete: async (folder) => {
        const confirmed = await dialogs.confirmDeleteFolder(folder.name);
        if (!confirmed) return;
        deleteFolder(folder.name);
      },
      onReorder: handleFolderReorder,
    });
  }

  return {
    updateFolderOptions,
    renderFolderManagerView,
  };
}
