import { beforeEach, describe, expect, test } from "bun:test";

import { getSharedChromeMock } from "../helpers/chromeMock.js";

const chromeMock = getSharedChromeMock();

const store = await import("../../src/lib/popup/store.js");
const { SETTINGS_KEY, STORAGE_KEY } = await import("../../src/lib/db.js");

beforeEach(() => {
  chromeMock.storage.local.clear();
  chromeMock.storage.sync.clear();
});

describe("popup/store", () => {
  test("getProfiles reads from storage", async () => {
    chromeMock.storage.local._store[STORAGE_KEY] = [{ id: "one" }];
    const profiles = await store.getProfiles();
    expect(profiles).toHaveLength(1);
  });

  test("saveProfiles persists profiles", async () => {
    await store.saveProfiles([{ id: "one" }]);
    expect(chromeMock.storage.local._store[STORAGE_KEY]).toHaveLength(1);
  });

  test("getSettings returns normalized defaults", async () => {
    const settings = await store.getSettings();
    expect(settings.viewMetric).toBe("open");
  });

  test("updateSettings persists patch", async () => {
    await store.updateSettings({ viewMetric: "focus" });
    expect(chromeMock.storage.local._store[SETTINGS_KEY].viewMetric).toBe("focus");
  });
});
