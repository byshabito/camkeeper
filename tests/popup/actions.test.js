import { beforeEach, describe, expect, test } from "bun:test";

import { getSharedChromeMock } from "../helpers/chromeMock.js";

const chromeMock = getSharedChromeMock();

const actions = await import("../../src/ui/popup/actions.js");
const { STORAGE_KEY, SETTINGS_KEY } = await import("../../src/repo/db.js");

beforeEach(() => {
  chromeMock.storage.local.clear();
  chromeMock.storage.sync.clear();
  chromeMock.storage.local._store[SETTINGS_KEY] = { lastSort: "month" };
  chromeMock.storage.local._store[STORAGE_KEY] = [];
});

describe("popup/actions", () => {
  test("loadListPreferences resolves default sort", async () => {
    const sortOptions = new Set(["recent", "month"]);
    const result = await actions.loadListPreferences({ sortOptions, defaultSort: "recent" });
    expect(result.sortKey).toBe("month");
  });

  test("saveSortPreference validates options", async () => {
    const sortOptions = new Set(["recent", "month"]);
    await actions.saveSortPreference("invalid", sortOptions);
    expect(chromeMock.storage.local._store[SETTINGS_KEY].lastSort).toBe("month");
    await actions.saveSortPreference("recent", sortOptions);
    expect(chromeMock.storage.local._store[SETTINGS_KEY].lastSort).toBe("recent");
  });

  test("saveProfileForm validates missing cams", async () => {
    const result = await actions.saveProfileForm({
      editingId: null,
      attachSelectedId: null,
      formData: {
        name: "",
        cams: [],
        socials: [],
        tags: "",
        folder: "",
        notes: "",
      },
    });
    expect(result.error).toBeTruthy();
  });

  test("saveProfileForm creates profile", async () => {
    const result = await actions.saveProfileForm({
      editingId: null,
      attachSelectedId: null,
      formData: {
        name: "Alpha",
        cams: [{ site: "twitch.tv", username: "alpha" }],
        socials: [{ platform: "x", handle: "alpha" }],
        tags: "one,two",
        folder: "Streamers",
        notes: "Notes",
      },
    });
    expect(result.savedProfile).toBeTruthy();
    expect(result.profiles).toHaveLength(1);
  });

  test("mergeProfilesByIds merges and saves", async () => {
    chromeMock.storage.local._store[STORAGE_KEY] = [
      {
        id: "one",
        name: "Alpha",
        cams: [{ site: "twitch.tv", username: "alpha" }],
        socials: [],
      },
      {
        id: "two",
        name: "Beta",
        cams: [{ site: "twitch.tv", username: "beta" }],
        socials: [],
      },
    ];
    const result = await actions.mergeProfilesByIds(["one", "two"]);
    expect(result.merged).toBeTruthy();
    expect(result.profiles).toHaveLength(1);
  });

  test("fetchLiveViewDeltas computes deltas", async () => {
    const now = Date.now();
    chromeMock.storage.local._store["camkeeper_active_view_sessions_v1"] = [
      { startedAt: now - 5000, site: "twitch.tv", username: "alpha" },
    ];
    const deltas = await actions.fetchLiveViewDeltas();
    expect(deltas.get("twitch.tv:alpha")).toBeGreaterThan(0);
  });
});
