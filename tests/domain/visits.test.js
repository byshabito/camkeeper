import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import { getDayStartMs, updateViewHistory } from "../../src/domain/visits.js";

describe("visits", () => {
  test("getDayStartMs returns midnight", () => {
    const sample = new Date("2024-01-10T15:30:00Z").getTime();
    const dayStart = getDayStartMs(sample);
    const day = new Date(dayStart);
    expect(day.getUTCHours()).toBe(0);
  });

  test("updateViewHistory merges durations", () => {
    const dayStart = getDayStartMs(Date.now());
    const history = [{ dayStart, durationMs: 200 }];
    const updated = updateViewHistory(history, Date.now(), 300);
    expect(updated).toEqual([{ dayStart, durationMs: 500 }]);
  });

  test("updateViewHistory property: sorted and bounded", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            dayStart: fc.integer({ min: 0, max: 50_000 }),
            durationMs: fc.integer({ min: 1, max: 5000 }),
          }),
        ),
        fc.integer({ min: 1, max: 50_000 }),
        fc.integer({ min: 1, max: 5000 }),
        (history, endedAt, durationMs) => {
          const updated = updateViewHistory(history, endedAt, durationMs, 50);
          const dayStarts = updated.map((entry) => entry.dayStart);
          const sorted = [...dayStarts].sort((a, b) => a - b);
          expect(dayStarts).toEqual(sorted);
          expect(updated.length).toBeLessThanOrEqual(50);
          updated.forEach((entry) => {
            expect(entry.durationMs).toBeGreaterThan(0);
          });
        },
      ),
    );
  });
});
