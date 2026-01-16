import { beforeEach, describe, expect, test } from "bun:test";

import { getSharedChromeMock } from "../helpers/chromeMock.js";

const chromeMock = getSharedChromeMock();

const repo = await import("../../src/lib/repo/settings.js");
const { SETTINGS_KEY } = await import("../../src/lib/db.js");

beforeEach(() => {
  chromeMock.storage.local.clear();
  chromeMock.storage.sync.clear();
});

describe("repo/settings", () => {
  test("getSettings returns normalized defaults", async () => {
    const settings = await repo.getSettings();
    expect(settings.viewMetric).toBe("open");
  });

  test("saveSettings normalizes and persists", async () => {
    const saved = await repo.saveSettings({ viewMetric: "page" });
    expect(saved.viewMetric).toBe("open");
    expect(chromeMock.storage.local._store[SETTINGS_KEY].viewMetric).toBe("open");
  });

  test("updateSettings applies patch", async () => {
    chromeMock.storage.local._store[SETTINGS_KEY] = { viewMetric: "open", lastSort: "week" };
    const updated = await repo.updateSettings({ lastSort: "month" });
    expect(updated.lastSort).toBe("month");
  });
});
