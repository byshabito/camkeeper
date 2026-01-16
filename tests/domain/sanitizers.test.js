import { beforeEach, describe, expect, test } from "bun:test";
import fc from "fast-check";

import { getSiteRegistry, setSiteRegistry } from "../../src/domain/siteRegistry.js";
import {
  migrateLegacyCams,
  sanitizeCams,
  sanitizeProfile,
  sanitizeSocials,
} from "../../src/domain/sanitizers.js";

describe("sanitizers", () => {
  beforeEach(() => {
    setSiteRegistry(["twitch.tv", "youtube.com"]);
  });

  test("sanitizeCams merges and filters cams", () => {
    const result = sanitizeCams([
      { site: "twitch.tv", username: "Alpha", viewMs: 1000, lastViewedAt: 10 },
      { site: "twitch.tv", username: "alpha", viewMs: 500, lastViewedAt: 30 },
      { site: "invalid.com", username: "nope" },
    ], { sites: getSiteRegistry() });
    expect(result).toHaveLength(1);
    expect(result[0].viewMs).toBe(1500);
    expect(result[0].lastViewedAt).toBe(30);
  });

  test("sanitizeSocials normalizes handles and dedupes", () => {
    const result = sanitizeSocials([
      { platform: "x", handle: "@Handle" },
      { platform: "x", handle: "handle" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ platform: "x", handle: "handle" });
  });

  test("sanitizeProfile fills defaults", () => {
    const profile = sanitizeProfile({
      cams: [{ site: "twitch.tv", username: "Alpha" }],
      tags: [" One ", "One"],
    }, { sites: getSiteRegistry() });
    expect(profile.name).toBe("alpha");
    expect(profile.tags).toEqual(["One"]);
  });

  test("migrateLegacyCams maps legacy structures", () => {
    const migrated = migrateLegacyCams([
      { name: "Old", site: [["twitch.tv", "Alpha"]], tags: ["Test"] },
    ], { sites: getSiteRegistry() });
    expect(migrated).toHaveLength(1);
    expect(migrated[0].cams[0]).toMatchObject({ site: "twitch.tv", username: "alpha" });
  });

  test("sanitizeCams property: outputs valid entries", () => {
    const knownSites = Object.keys(getSiteRegistry());
    const siteArb = fc.oneof(
      fc.constant(knownSites[0]),
      fc.constant(knownSites[1]),
      fc.constant("example.com"),
    );
    const nameChar = fc.constantFrom("a", "b", "c", "1", "2", "3", "_", "-");
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            site: siteArb,
            username: fc.stringOf(nameChar, { minLength: 0, maxLength: 8 }),
            viewMs: fc.integer({ min: 0, max: 5000 }),
            lastViewedAt: fc.integer({ min: 0, max: 5000 }),
          }),
        ),
        (cams) => {
          const sanitized = sanitizeCams(cams, { sites: getSiteRegistry() });
          const seenKeys = new Set();
          sanitized.forEach((cam) => {
            expect(knownSites.includes(cam.site)).toBe(true);
            expect(cam.username).not.toBe("");
            expect(Number.isFinite(cam.viewMs)).toBe(true);
            const key = `${cam.site}:${cam.username}`;
            expect(seenKeys.has(key)).toBe(false);
            seenKeys.add(key);
          });
        },
      ),
    );
  });
});
