export function createViewStateMachine({
  views,
  settingsUi,
  state,
  selection,
  setViewVisibility,
  setSettingsToggleState,
  onView = {},
}) {
  const { settingsToggle, settingsIcon, overviewIcon, isEmbedded } = settingsUi;
  const viewConfig = {
    list: { settingsMode: "settings", lastView: "list", lastNonSettings: "list", clearSelection: true },
    form: { settingsMode: "hidden", lastNonSettings: "form" },
    detail: { settingsMode: "hidden", lastView: "detail", lastNonSettings: "detail" },
    folder: { settingsMode: "settings", lastView: "list", lastNonSettings: "folder", clearSelection: true },
    settings: { settingsMode: "overview", lastView: "settings", clearSelection: true },
  };

  const applyConfig = (view) => {
    setViewVisibility(views, view);
    const config = viewConfig[view];
    if (config?.settingsMode) {
      setSettingsToggleState(
        { settingsToggle, settingsIcon, overviewIcon, isEmbedded },
        config.settingsMode,
      );
    }
    if (config?.clearSelection) selection?.setSelectMode(false);
    const updates = {};
    if (config?.lastView) updates.lastView = config.lastView;
    if (config?.lastNonSettings) updates.lastNonSettingsView = config.lastNonSettings;
    if (Object.keys(updates).length) state.set(updates);
  };

  const go = (view, payload) => {
    if (!viewConfig[view]) return;
    applyConfig(view);
    if (onView[view]) onView[view](payload);
  };

  const restoreFromSettings = () => {
    const lastNonSettingsView = state.getValue("lastNonSettingsView");
    switch (lastNonSettingsView) {
      case "folder":
        go("folder");
        return;
      case "detail": {
        const profile = state.getValue("currentProfile");
        if (profile) go("detail", profile);
        else go("list");
        return;
      }
      case "form": {
        const currentProfile = state.getValue("currentProfile");
        const editingId = state.getValue("editingId");
        if (currentProfile || editingId) {
          const title = onView.getFormTitle ? onView.getFormTitle() : "Edit profile";
          go("form", title);
        } else {
          go("list");
        }
        return;
      }
      default:
        go("list");
    }
  };

  const toggleSettings = () => {
    if (!views.settingsView) return;
    const isHidden = views.settingsView.classList.contains("hidden");
    if (isHidden) go("settings");
    else restoreFromSettings();
  };

  return { go, toggleSettings };
}
