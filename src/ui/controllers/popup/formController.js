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

export function createFormController({
  state,
  viewState,
  dialogs,
  formTitle,
  formError,
  profileForm,
  attachField,
  attachSelect,
  nameInput,
  tagsInput,
  folderSelect,
  folderInput,
  notesInput,
  camRows,
  socialRows,
  addCamButton,
  addSocialButton,
  cancelButton,
  deleteButton,
  siteKeys: initialSiteKeys,
  sites: initialSites,
  socialOptions: initialSocialOptions,
  parseCamInput,
  parseSocialInput,
  selectFormViewModel,
  selectAttachFormViewModel,
  applyFormViewModel,
  createFormRow,
  createFolderSelectHandlers,
  getAttachSelection,
  getFormData,
  clearFormError,
  showFormError,
  saveProfileForm,
  deleteProfileById,
  fetchProfiles,
  onUpdateFolderOptions,
}) {
  let siteKeys = initialSiteKeys;
  let sites = initialSites;
  let socialOptions = initialSocialOptions;
  let currentViewState = viewState;

  function bindHandlers() {
    if (typeof createFolderSelectHandlers === "function") {
      createFolderSelectHandlers({ folderSelect, folderInput }).forEach(
        ({ element, event, handler }) => {
          element.addEventListener(event, handler);
        },
      );
    }

    if (cancelButton) {
      cancelButton.addEventListener("click", () => {
        const lastView = state.getValue("lastView");
        const currentProfile = state.getValue("currentProfile");
        if (lastView === "detail" && currentProfile) {
          currentViewState?.go("detail", currentProfile);
        } else {
          currentViewState?.go("list");
        }
      });
    }

    if (deleteButton) {
      deleteButton.addEventListener("click", async () => {
        const editingId = state.getValue("editingId");
        const currentProfile = state.getValue("currentProfile");
        if (!editingId) return;
        const name = (currentProfile && currentProfile.name) || "this profile";
        const confirmed = await dialogs.confirmDeleteProfile(name);
        if (!confirmed) return;
        await deleteProfileById(editingId);
        state.set({ editingId: null, currentProfile: null });
        currentViewState?.go("list");
      });
    }

    if (addCamButton) {
      addCamButton.addEventListener("click", () => {
        camRows.appendChild(
          createFormRow({
            type: "cam",
            values: {},
            siteKeys,
            sites,
            socialOptions,
            parseCamInput,
            parseSocialInput,
          }),
        );
      });
    }

    if (addSocialButton) {
      addSocialButton.addEventListener("click", () => {
        socialRows.appendChild(
          createFormRow({
            type: "social",
            values: {},
            siteKeys,
            sites,
            socialOptions,
            parseCamInput,
            parseSocialInput,
          }),
        );
      });
    }

    if (attachSelect) {
      attachSelect.addEventListener("change", handleAttachChange);
    }

    if (profileForm) {
      profileForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearFormError(formError);

        const selectedAttachId = getAttachSelection({ attachField, attachSelect });
        const formData = getFormData({
          elements: {
            nameInput,
            tagsInput,
            folderSelect,
            folderInput,
            notesInput,
            camRows,
            socialRows,
          },
        });
        const result = await saveProfileForm({
          editingId: state.getValue("editingId"),
          attachSelectedId: selectedAttachId,
          formData,
        });
        if (result.error) {
          showFormError(formError, result.error);
          return;
        }
        currentViewState?.go("detail", result.savedProfile);
      });
    }
  }

  function applyForm(profile, seedCams, profiles, selectedAttachId = null) {
    const viewModel = selectFormViewModel({
      profile,
      seedCams,
      profiles,
      editingId: state.getValue("editingId"),
      defaultSiteKey: siteKeys[0],
    });
    applyFormViewModel({
      viewModel,
      elements: {
        nameInput,
        tagsInput,
        folderInput,
        notesInput,
        camRows,
        socialRows,
        attachField,
        attachSelect,
      },
      createFormRow,
      siteKeys,
      sites,
      socialOptions,
      parseCamInput,
      parseSocialInput,
      selectedAttachId,
    });
  }

  function handleAttachChange() {
    const selectedId = getAttachSelection({ attachField, attachSelect });
    const viewModel = selectAttachFormViewModel({
      selectedId,
      profiles: state.getValue("attachProfiles"),
      seedCams: state.getValue("attachSeedCams"),
      editingId: state.getValue("editingId"),
      defaultSiteKey: siteKeys[0],
    });
    if (!viewModel) return;
    applyFormViewModel({
      viewModel,
      elements: {
        nameInput,
        tagsInput,
        folderInput,
        notesInput,
        camRows,
        socialRows,
        attachField,
        attachSelect,
      },
      createFormRow,
      siteKeys,
      sites,
      socialOptions,
      parseCamInput,
      parseSocialInput,
      selectedAttachId: selectedId || "",
    });
    onUpdateFolderOptions(state.getValue("attachProfiles"), viewModel.form.folder);
  }

  async function openEditor(profile, seedCams, source = "list", profiles = []) {
    state.set({
      editingId: profile ? profile.id : null,
      currentProfile: profile || null,
      lastView: source,
      attachProfiles: profiles || [],
      attachSeedCams: seedCams || [],
    });
    applyForm(profile, seedCams, state.getValue("attachProfiles"));
    const currentFolder = profile ? profile.folder : "";
    if (state.getValue("attachProfiles").length) {
      onUpdateFolderOptions(state.getValue("attachProfiles"), currentFolder);
    } else {
      fetchProfiles().then((profilesList) => onUpdateFolderOptions(profilesList, currentFolder));
    }
    currentViewState?.go("form", profile ? "Edit profile" : "New profile");
  }

  function applyPendingForm() {
    const currentProfile = state.getValue("currentProfile");
    applyForm(
      currentProfile,
      state.getValue("attachSeedCams"),
      state.getValue("attachProfiles"),
    );
  }

  function updateSiteRegistry(nextSiteKeys, nextSites) {
    siteKeys = nextSiteKeys;
    sites = nextSites;
  }

  function updateSocialOptions(nextOptions) {
    socialOptions = nextOptions;
  }

  function updateViewState(nextViewState) {
    currentViewState = nextViewState;
  }

  function setFormTitle(title) {
    if (formTitle) {
      formTitle.textContent = title;
    }
    if (deleteButton) {
      deleteButton.classList.toggle("hidden", !state.getValue("editingId"));
    }
  }

  function clearError() {
    clearFormError(formError);
  }

  return {
    bindHandlers,
    openEditor,
    applyPendingForm,
    updateSiteRegistry,
    updateSocialOptions,
    updateViewState,
    setFormTitle,
    clearError,
  };
}
