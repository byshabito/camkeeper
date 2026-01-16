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

import { findDuplicateProfile } from "../../../domain/profiles.js";
import { normalizeText } from "../../../domain/text.js";
import { parseSocialUrl, parseUrl } from "../../../domain/urls.js";

export function createListController({
  state,
  sites,
  viewState,
  selection,
  profileList,
  emptyState,
  formTitle,
  detailElements,
  updateFolderOptions,
  fetchProfiles,
  fetchLiveViewDeltas,
  toggleProfilePin,
  applyLiveViewDeltas,
  selectProfileListViewModel,
  selectDetailViewModel,
  renderProfileList,
  renderProfileDetail,
  formatDuration,
  formatSocialHandle,
  buildSocialUrl,
  getPlatformIconSvg,
  getSocialIconSvg,
  getPinIconSvg,
  getFolderIconSvg,
  normalizeSocialHandle,
}) {
  let renderListToken = 0;

  async function renderList() {
    const token = ++renderListToken;
    const profiles = await fetchProfiles();
    if (token !== renderListToken) return;
    const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
    if (profileList && emptyState) {
      updateFolderOptions(profiles);
    }
    const viewModel = selectProfileListViewModel(profiles, {
      query: state.getValue("listQuery"),
      folderKey: state.getValue("listFolderFilter"),
      sortKey: state.getValue("listSortKey"),
      sites,
      getPlatformIconSvg,
    });
    if (token !== renderListToken) return;
    if (profileList && emptyState && typeof globalThis.document !== "undefined") {
      renderProfileList({
        profiles: viewModel.profiles,
        elements: { profileList, emptyState },
        selection,
        getPinIconSvg,
        onPinToggle: async (profileId) => {
          await toggleProfilePin(profileId);
          renderList();
        },
        onOpenDetail: (profileId) => {
          const profile = profilesById.get(profileId);
          if (profile) viewState.go("detail", profile);
        },
        emptyMessage: viewModel.emptyMessage,
      });
    }
  }

  async function renderDetail(profile) {
    if (!profile) return;
    const liveDeltas = await fetchLiveViewDeltas();
    const [adjustedProfile] = applyLiveViewDeltas([profile], liveDeltas);
    state.setValue("currentProfile", adjustedProfile);
    const viewModel = selectDetailViewModel(adjustedProfile, {
      formatDuration,
      formatSocialHandle,
      buildSocialUrl,
      sites,
      getPlatformIconSvg,
      getSocialIconSvg,
    });
    renderProfileDetail({
      viewModel,
      elements: detailElements,
      getPinIconSvg,
      getFolderIconSvg,
    });
  }

  function showInitialView() {
    const currentProfile = state.getValue("currentProfile");
    const lastView = state.getValue("lastView");
    if (lastView === "detail" && currentProfile) {
      viewState.go("detail", currentProfile);
      return;
    }
    if (lastView === "form") {
      const editingId = state.getValue("editingId");
      if (editingId || currentProfile) {
        viewState.go("form", formTitle?.textContent || "Edit profile");
        return;
      }
    }
    if (lastView === "folder") {
      viewState.go("folder");
      return;
    }
    viewState.go("list");
  }

  async function addFromCurrentTab(profiles, { onOpenEditor } = {}) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const parsed = tab?.url ? parseUrl(tab.url, sites) : null;

    if (parsed) {
      const match = findDuplicateProfile(
        profiles,
        { cams: [{ site: parsed.site, username: parsed.username }] },
        null,
        { sites },
      );

      if (match) {
        viewState.go("detail", match);
        return;
      }
    }
    const socialParsed = tab?.url ? parseSocialUrl(tab.url) : null;
    if (socialParsed) {
      const socialMatch = profiles.find((profile) =>
        (profile.socials || []).some(
          (social) =>
            normalizeText(social.platform) === socialParsed.platform &&
            normalizeSocialHandle(social.platform, social.handle) === socialParsed.handle,
        ),
      );
      if (socialMatch) {
        viewState.go("detail", socialMatch);
        return;
      }
    }
    onOpenEditor?.({ seedCams: parsed ? [{ site: parsed.site, username: parsed.username }] : [] });
  }

  return {
    renderList,
    renderDetail,
    showInitialView,
    addFromCurrentTab,
  };
}
