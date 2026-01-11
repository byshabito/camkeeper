export const SETTINGS_DEFAULTS = Object.freeze({
  viewMetric: "focus",
  lastSort: "month",
  lastFolderFilter: "",
  lastFolderOrder: [],
});

export function normalizeSettings(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    ...SETTINGS_DEFAULTS,
    viewMetric: (() => {
      if (source.viewMetric === "page") return "open";
      if (source.viewMetric === "open" || source.viewMetric === "focus") return source.viewMetric;
      return SETTINGS_DEFAULTS.viewMetric;
    })(),
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
