import { describe, expect, test } from "bun:test";

import { mergeProfiles, matchQuery, findDuplicateProfile } from "../../src/domain/profiles.js";

describe("profiles", () => {
  test("matchQuery searches across fields", () => {
    const profile = {
      name: "Alpha",
      folder: "Favorites",
      notes: "Some notes",
      tags: ["Cool"],
      cams: [{ site: "twitch.tv", username: "Alpha" }],
      socials: [{ platform: "x", handle: "alpha" }],
    };
    expect(matchQuery(profile, "fav")).toBe(true);
    expect(matchQuery(profile, "x")).toBe(true);
    expect(matchQuery(profile, "missing")).toBe(false);
  });

  test("findDuplicateProfile matches by cam", () => {
    const profiles = [
      {
        id: "one",
        cams: [{ site: "twitch.tv", username: "alpha" }],
      },
    ];
    const duplicate = findDuplicateProfile(profiles, {
      cams: [{ site: "twitch.tv", username: "Alpha" }],
    });
    expect(duplicate.id).toBe("one");
    expect(findDuplicateProfile(profiles, { cams: [] }, "one")).toBeUndefined();
  });

  test("mergeProfiles combines data and notes", () => {
    const base = {
      id: "one",
      name: "Alpha",
      notes: "First",
      tags: ["one"],
      cams: [{ site: "twitch.tv", username: "alpha" }],
      socials: [],
      pinned: false,
      updatedAt: 0,
    };
    const incoming = {
      notes: "Second",
      tags: ["two"],
      cams: [{ site: "twitch.tv", username: "alpha" }],
      socials: [{ platform: "x", handle: "alpha" }],
      pinned: true,
    };
    const merged = mergeProfiles(base, incoming);
    expect(merged.notes).toBe("First\nSecond");
    expect(merged.tags).toEqual(["one", "two"]);
    expect(merged.socials).toHaveLength(1);
    expect(merged.pinned).toBe(true);
  });
});
