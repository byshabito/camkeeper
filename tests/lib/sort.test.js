import { describe, expect, test } from "bun:test";

import {
  lastViewed,
  sortBySelection,
  totalViewTime,
  totalViewTimeInWindow,
} from "../../src/lib/sort.js";

describe("sort", () => {
  test("totalViewTime sums cam viewMs", () => {
    const profile = {
      cams: [{ viewMs: 100 }, { viewMs: 250 }],
    };
    expect(totalViewTime(profile)).toBe(350);
  });

  test("totalViewTimeInWindow filters by window", () => {
    const now = new Date("2024-02-01T00:00:00Z").getTime();
    const within = new Date("2024-01-15T00:00:00Z").getTime();
    const outside = new Date("2023-12-01T00:00:00Z").getTime();
    const profile = {
      cams: [
        {
          viewHistory: [
            { dayStart: within, durationMs: 120 },
            { dayStart: outside, durationMs: 200 },
          ],
        },
      ],
    };
    expect(totalViewTimeInWindow(profile, now)).toBe(120);
  });

  test("sortBySelection respects pinning and mode", () => {
    const profiles = [
      { name: "Bravo", pinned: false, updatedAt: 1, cams: [] },
      { name: "Alpha", pinned: true, updatedAt: 2, cams: [] },
    ];
    const sorted = sortBySelection(profiles, "name");
    expect(sorted[0].name).toBe("Alpha");
  });

  test("lastViewed returns latest timestamp", () => {
    const profile = {
      cams: [
        { lastViewedAt: 10 },
        { lastViewedAt: 25 },
      ],
    };
    expect(lastViewed(profile)).toBe(25);
  });
});
