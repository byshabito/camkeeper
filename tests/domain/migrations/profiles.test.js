import { describe, expect, test } from "bun:test";

import {
  LEGACY_PROFILE_KEYS,
  migrateProfilesFromStorage,
  normalizeProfileForStorage,
} from "../../../src/domain/migrations/profiles.js";

const storageKey = "camkeeper_profiles_v1";

function createProfile() {
  return { name: "Alpha", cams: [{ site: "twitch.tv", username: "alpha" }] };
}

describe("domain/migrations/profiles", () => {
  test("migrateProfilesFromStorage adds ids", () => {
    const data = { [storageKey]: [createProfile()] };
    const result = migrateProfilesFromStorage({
      data,
      storageKey,
      legacyKeys: LEGACY_PROFILE_KEYS,
      now: () => 123,
    });
    expect(result.profiles[0].id).toBeTruthy();
    expect(result.profiles[0].createdAt).toBe(123);
    expect(result.shouldPersist).toBe(true);
  });

  test("migrateProfilesFromStorage uses legacy keys", () => {
    const data = { profiles: [createProfile()] };
    const result = migrateProfilesFromStorage({
      data,
      storageKey,
      legacyKeys: LEGACY_PROFILE_KEYS,
      now: () => 456,
    });
    expect(result.profiles[0].id).toBeTruthy();
    expect(result.profiles[0].createdAt).toBe(456);
  });

  test("normalizeProfileForStorage preserves fields", () => {
    const normalized = normalizeProfileForStorage({
      id: "one",
      name: "Alpha",
      cams: [{ site: "twitch.tv", username: "alpha" }],
      createdAt: 100,
      updatedAt: 200,
    }, {
      now: () => 999,
    });
    expect(normalized.id).toBe("one");
    expect(normalized.createdAt).toBe(100);
    expect(normalized.updatedAt).toBe(200);
  });
});
