import { describe, expect, test } from "bun:test";

import { createId } from "../../src/domain/ids.js";

describe("ids", () => {
  test("createId returns a unique string", () => {
    const ids = new Set();
    for (let index = 0; index < 10; index += 1) {
      const value = createId();
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
      ids.add(value);
    }
    expect(ids.size).toBe(10);
  });
});
