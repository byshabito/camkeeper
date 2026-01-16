import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import { applySettingsPatch, normalizeSettings, SETTINGS_DEFAULTS } from "../../src/domain/settings.js";

describe("settings", () => {
  test("normalizeSettings falls back to defaults", () => {
    const normalized = normalizeSettings({});
    expect(normalized.viewMetric).toBe(SETTINGS_DEFAULTS.viewMetric);
    expect(normalized.lastSort).toBe(SETTINGS_DEFAULTS.lastSort);
    expect(normalized.livestreamSites.length).toBeGreaterThan(0);
  });

  test("normalizeSettings maps legacy viewMetric", () => {
    const normalized = normalizeSettings({ viewMetric: "page" });
    expect(normalized.viewMetric).toBe("open");
  });

  test("applySettingsPatch merges and normalizes", () => {
    const current = { viewMetric: "open", lastSort: "week" };
    const next = applySettingsPatch(current, { viewMetric: "focus" });
    expect(next.viewMetric).toBe("focus");
    expect(next.lastSort).toBe("week");
  });

  test("normalizeSettings property: viewMetric is valid", () => {
    fc.assert(
      fc.property(fc.string(), (value) => {
        const normalized = normalizeSettings({ viewMetric: value });
        expect(["open", "focus"]).toContain(normalized.viewMetric);
      }),
    );
  });
});
