import { beforeEach, describe, expect, test } from "bun:test";

import { getSharedChromeMock } from "../helpers/chromeMock.js";

const chromeMock = getSharedChromeMock();

const repo = await import("../../src/lib/repo/profiles.js");
const { STORAGE_KEY } = await import("../../src/lib/db.js");

beforeEach(() => {
  chromeMock.storage.local.clear();
  chromeMock.storage.sync.clear();
});

describe("repo/profiles", () => {
  test("getProfiles fills missing fields and persists", async () => {
    chromeMock.storage.local._store[STORAGE_KEY] = [
      { name: "Alpha", cams: [{ site: "twitch.tv", username: "alpha" }] },
    ];
    const profiles = await repo.getProfiles();
    expect(profiles).toHaveLength(1);
    const profile = profiles[0];
    expect(typeof profile.id).toBe("string");
    expect(typeof profile.createdAt).toBe("number");
    expect(profile.updatedAt).toBe(profile.createdAt);
    const stored = chromeMock.storage.local._store[STORAGE_KEY][0];
    expect(stored.id).toBe(profile.id);
  });

  test("saveProfile ensures identifiers", async () => {
    const saved = await repo.saveProfile({
      name: "Beta",
      cams: [{ site: "twitch.tv", username: "beta" }],
    });
    expect(saved.id).toBeTruthy();
    expect(saved.createdAt).toBeTruthy();
    expect(saved.updatedAt).toBe(saved.createdAt);
  });

  test("recordProfileView updates view stats", async () => {
    chromeMock.storage.local._store[STORAGE_KEY] = [
      {
        id: "one",
        name: "Alpha",
        cams: [{ site: "twitch.tv", username: "alpha", viewMs: 100, viewHistory: [] }],
      },
    ];
    const endedAt = Date.now();
    const updated = await repo.recordProfileView({
      site: "twitch.tv",
      username: "alpha",
      endedAt,
      durationMs: 200,
    });
    expect(updated).toBe(true);
    const profiles = await repo.getProfiles();
    const cam = profiles[0].cams[0];
    expect(cam.viewMs).toBe(300);
    expect(cam.lastViewedAt).toBe(endedAt);
    expect(cam.viewHistory.length).toBe(1);
  });
});
