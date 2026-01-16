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

export function createPopupState(initial = {}) {
  const state = {
    editingId: null,
    currentProfile: null,
    lastView: "list",
    lastNonSettingsView: "list",
    attachProfiles: [],
    attachSeedCams: [],
    preferredFolderFilter: "",
    preferredFolderOrder: [],
    listQuery: "",
    listSortKey: "",
    listFolderFilter: "",
    ...initial,
  };

  return {
    getValue(key) {
      return state[key];
    },
    setValue(key, value) {
      state[key] = value;
      return value;
    },
    set(patch) {
      Object.assign(state, patch);
      return state;
    },
    getSnapshot() {
      return { ...state };
    },
  };
}
