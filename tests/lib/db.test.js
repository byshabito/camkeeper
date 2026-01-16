import { beforeEach, describe, expect, test } from "bun:test";

import { getSharedChromeMock } from "../helpers/chromeMock.js";

const chromeMock = getSharedChromeMock();

const db = await import("../../src/repo/db.js");

beforeEach(() => {
  chromeMock.storage.local.clear();
  chromeMock.storage.sync.clear();
  chromeMock.runtime.lastError = null;
});

describe("db", () => {
  test("saveProfile writes to storage", async () => {
    await db.saveProfile({ id: "one", name: "Alpha" });
    const stored = chromeMock.storage.local._store[db.STORAGE_KEY];
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe("one");
  });

  test("getProfile finds stored profile", async () => {
    chromeMock.storage.local._store[db.STORAGE_KEY] = [{ id: "one", name: "Alpha" }];
    const profile = await db.getProfile("one");
    expect(profile).toMatchObject({ id: "one", name: "Alpha" });
  });

  test("saveSettings persists settings", async () => {
    await db.saveSettings({ viewMetric: "open" });
    expect(chromeMock.storage.local._store[db.SETTINGS_KEY]).toEqual({ viewMetric: "open" });
  });

  test("setState stores state values", async () => {
    await db.setState("key", { value: 1 });
    const value = await db.getState("key");
    expect(value).toEqual({ value: 1 });
  });
});
