import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import {
  buildSites,
  normalizeHost,
  normalizeLivestreamHost,
  normalizeLivestreamSiteEntries,
} from "../../src/domain/sites.js";

describe("sites", () => {
  test("normalizeHost removes common prefixes", () => {
    expect(normalizeHost("www.youtube.com")).toBe("youtube.com");
    expect(normalizeHost("m.mobile.Twitch.tv")).toBe("twitch.tv");
  });

  test("normalizeLivestreamHost accepts urls and domains", () => {
    expect(normalizeLivestreamHost("https://www.twitch.tv/streamer")).toBe("twitch.tv");
    expect(normalizeLivestreamHost("youtube.com/channel/abc")).toBe("youtube.com");
  });

  test("normalizeLivestreamSiteEntries merges duplicate hosts", () => {
    const entries = normalizeLivestreamSiteEntries([
      { host: "twitch.tv", label: "Twitch" },
      { host: "twitch.tv", abbr: "TW" },
      "youtube.com",
    ]);
    const twitch = entries.find((entry) => entry.host === "twitch.tv");
    const youtube = entries.find((entry) => entry.host === "youtube.com");
    expect(twitch).toMatchObject({ host: "twitch.tv", abbr: "TW" });
    expect(youtube).toMatchObject({ host: "youtube.com" });
  });

  test("buildSites injects metadata defaults", () => {
    const sites = buildSites(["twitch.tv"]);
    expect(sites["twitch.tv"].label).toBe("Twitch");
    expect(sites["twitch.tv"].abbr).toBe("TW");
    expect(sites["twitch.tv"].color).toBe("#9146ff");
  });

  test("normalizeLivestreamHost property: strips prefixes", () => {
    fc.assert(
      fc.property(fc.string(), (value) => {
        const normalized = normalizeLivestreamHost(value);
        if (!normalized) return;
        expect(normalized).toBe(normalized.toLowerCase());
        expect(normalized.startsWith("www.")).toBe(false);
        expect(normalized.startsWith("m.")).toBe(false);
        expect(normalized.startsWith("mobile.")).toBe(false);
        expect(normalized.startsWith("amp.")).toBe(false);
      }),
    );
  });
});
