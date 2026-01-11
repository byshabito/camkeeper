export const SETTINGS_DEFAULTS = Object.freeze({
  debugLogsEnabled: false,
  lastSort: "month",
  lastFolderFilter: "",
  lastFolderOrder: [],
});

export function normalizeSettings(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    ...SETTINGS_DEFAULTS,
    debugLogsEnabled:
      typeof source.debugLogsEnabled === "boolean"
        ? source.debugLogsEnabled
        : SETTINGS_DEFAULTS.debugLogsEnabled,
    lastSort: typeof source.lastSort === "string" ? source.lastSort : SETTINGS_DEFAULTS.lastSort,
    lastFolderFilter:
      typeof source.lastFolderFilter === "string"
        ? source.lastFolderFilter
        : SETTINGS_DEFAULTS.lastFolderFilter,
    lastFolderOrder: Array.isArray(source.lastFolderOrder)
      ? source.lastFolderOrder.filter((item) => typeof item === "string")
      : SETTINGS_DEFAULTS.lastFolderOrder,
  };
}

export function applySettingsPatch(current, patch) {
  const base = normalizeSettings(current);
  const next = typeof patch === "function" ? patch(base) : { ...base, ...patch };
  return normalizeSettings(next);
}
