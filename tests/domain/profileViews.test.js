import { describe, expect, test } from "bun:test";

import { applyProfileView } from "../../src/domain/profileViews.js";

function createProfile({ site = "twitch.tv", username = "alpha" } = {}) {
  return {
    id: "one",
    name: "Alpha",
    cams: [{ site, username, viewMs: 10, viewHistory: [] }],
  };
}

describe("domain/profileViews", () => {
  test("applyProfileView updates matching cam", () => {
    const profiles = [createProfile()];
    const result = applyProfileView({
      profiles,
      site: "twitch.tv",
      username: "alpha",
      endedAt: 1000,
      durationMs: 500,
    });
    expect(result.updated).toBe(true);
    expect(result.profiles[0].cams[0].viewMs).toBe(510);
    expect(result.profiles[0].cams[0].lastViewedAt).toBe(1000);
  });

  test("applyProfileView ignores missing cam", () => {
    const profiles = [createProfile({ site: "twitch.tv", username: "beta" })];
    const result = applyProfileView({
      profiles,
      site: "twitch.tv",
      username: "alpha",
      endedAt: 2000,
      durationMs: 100,
    });
    expect(result.updated).toBe(false);
    expect(result.profiles[0].cams[0].viewMs).toBe(10);
  });
});
