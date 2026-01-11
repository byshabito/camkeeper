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
