import { describe, expect, test } from "bun:test";

import { buildFallbackSites, matchLegacyUrl } from "../../src/domain/urlsLegacy.js";

const sites = { "twitch.tv": { host: "twitch.tv" }, "youtube.com": { host: "youtube.com" } };

describe("urlsLegacy", () => {
  test("buildFallbackSites ensures host entries", () => {
    const fallback = buildFallbackSites({ "twitch.tv": {}, "example.com": { host: "example.com" } });
    expect(fallback["twitch.tv"].host).toBe("twitch.tv");
    expect(fallback["example.com"].host).toBe("example.com");
  });

  test("matchLegacyUrl extracts site and username", () => {
    const parsed = matchLegacyUrl("https://twitch.tv/Alpha", sites);
    expect(parsed).toEqual({ site: "twitch.tv", username: "alpha" });
  });

  test("matchLegacyUrl ignores unknown hosts", () => {
    const parsed = matchLegacyUrl("https://example.com/Alpha", sites);
    expect(parsed).toBeNull();
  });
});
