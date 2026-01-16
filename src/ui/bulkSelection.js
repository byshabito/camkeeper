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

export function createBulkSelection({
  bulkBar,
  bulkCount,
  bulkMerge,
  bulkDelete,
  bulkCancel,
  selectButton,
  emptyLabel = "Select profiles",
  onMerge,
  onDelete,
  onRender,
}) {
  let selectMode = false;
  let selectedIds = new Set();

  function updateBulkBar() {
    const count = selectedIds.size;
    bulkCount.textContent = count ? `${count} selected` : emptyLabel;
    bulkBar.classList.toggle("hidden", !selectMode);
    bulkMerge.disabled = count < 2;
    bulkDelete.disabled = count === 0;
  }

  function setSelectMode(enabled) {
    selectMode = enabled;
    if (!selectMode) selectedIds = new Set();
    updateBulkBar();
    if (onRender) onRender();
  }

  function toggleSelection(id) {
    if (selectedIds.has(id)) selectedIds.delete(id);
    else selectedIds.add(id);
    updateBulkBar();
    if (onRender) onRender();
  }

  function isSelected(id) {
    return selectedIds.has(id);
  }

  function getSelectedIds() {
    return Array.from(selectedIds);
  }

  function isActive() {
    return selectMode;
  }

  selectButton.addEventListener("click", () => setSelectMode(!selectMode));
  bulkCancel.addEventListener("click", () => setSelectMode(false));
  bulkMerge.addEventListener("click", () => onMerge(getSelectedIds()));
  bulkDelete.addEventListener("click", () => onDelete(getSelectedIds()));

  updateBulkBar();

  return {
    setSelectMode,
    toggleSelection,
    isSelected,
    isActive,
    getSelectedIds,
  };
}
