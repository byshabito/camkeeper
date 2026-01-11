import { initConfirmModal } from "../confirmModal.js";

export function createPopupDialogs() {
  const confirm = initConfirmModal();

  return {
    confirmDeleteProfiles: (names) =>
      confirm({
        titleText: "Delete profiles",
        messageText: `Delete ${names.length} profile${names.length === 1 ? "" : "s"}? This cannot be undone.`,
        items: names,
      }),
    confirmDeleteProfile: (name) =>
      confirm({
        titleText: "Delete profile",
        messageText: `Delete ${name}? This cannot be undone.`,
      }),
    confirmDeleteFolder: (folderName) =>
      confirm({
        titleText: "Delete folder",
        messageText: `Delete folder "${folderName}"? Profiles in this folder will move to "No folder".`,
      }),
  };
}
