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

export function createDetailController({
  state,
  viewState,
  detailBackButton,
  detailEditButton,
  detailPinButton,
  onOpenEditor,
  toggleProfilePin,
}) {
  let currentViewState = viewState;

  function bindHandlers() {
    if (detailBackButton) {
      detailBackButton.addEventListener("click", () => currentViewState?.go("list"));
    }

    if (detailEditButton) {
      detailEditButton.addEventListener("click", () => {
        const profile = state.getValue("currentProfile");
        if (profile) onOpenEditor(profile, profile.cams || [], "detail", []);
      });
    }

    if (detailPinButton) {
      detailPinButton.addEventListener("click", async () => {
        const currentProfile = state.getValue("currentProfile");
        if (!currentProfile) return;
        const { updatedProfile } = await toggleProfilePin(currentProfile.id);
        if (updatedProfile) viewState.go("detail", updatedProfile);
      });
    }
  }

  function updateViewState(nextViewState) {
    currentViewState = nextViewState;
  }

  return {
    bindHandlers,
    updateViewState,
  };
}
