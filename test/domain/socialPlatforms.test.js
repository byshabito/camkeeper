import test from "node:test";
import assert from "node:assert/strict";

import { normalizeSocialPlatform } from "../../src/domain/socialPlatforms.js";
import { sanitizeSocials } from "../../src/domain/sanitizers.js";
import { migrateProfilesFromStorage } from "../../src/domain/migrations/profiles.js";

test("normalizeSocialPlatform canonicalizes other and unsupported values to website", () => {
  assert.equal(normalizeSocialPlatform("website"), "website");
  assert.equal(normalizeSocialPlatform("other"), "website");
  assert.equal(normalizeSocialPlatform("mastodon"), "website");
  assert.equal(normalizeSocialPlatform(""), "");
});

test("sanitizeSocials rewrites fallback socials to website and deduplicates them", () => {
  const result = sanitizeSocials([
    { platform: "other", handle: "example.com" },
    { platform: "website", handle: "https://example.com/" },
    { platform: "linktree", handle: "links.example/alpha" },
  ]);

  assert.deepEqual(result, [
    { platform: "website", handle: "example.com" },
    { platform: "website", handle: "links.example/alpha" },
  ]);
});

test("migrateProfilesFromStorage marks legacy other socials for persistence", () => {
  const { profiles, shouldPersist } = migrateProfilesFromStorage({
    data: {
      camkeeper_profiles_v1: [{
        id: "alpha",
        name: "Alpha",
        cams: [{ site: "twitch.tv", username: "alpha" }],
        socials: [{ platform: "other", handle: "example.com" }],
        tags: [],
        folder: "",
        notes: "",
        pinned: false,
        createdAt: 1,
        updatedAt: 1,
      }],
    },
    storageKey: "camkeeper_profiles_v1",
    legacyKeys: [],
    sites: { "twitch.tv": { host: "twitch.tv" } },
  });

  assert.equal(shouldPersist, true);
  assert.deepEqual(profiles[0].socials, [{ platform: "website", handle: "example.com" }]);
});
