export function createBulkSelection({
  bulkBar,
  bulkCount,
  bulkMerge,
  bulkDelete,
  bulkCancel,
  selectButton,
  emptyLabel = "Select bookmarks",
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
