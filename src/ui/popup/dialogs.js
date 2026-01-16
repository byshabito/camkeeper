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
