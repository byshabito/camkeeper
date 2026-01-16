import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import { normalizeText, splitTags } from "../../src/domain/text.js";

describe("text", () => {
  test("normalizeText trims and lowercases", () => {
    expect(normalizeText("  HeLLo  ")).toBe("hello");
    expect(normalizeText("\nWorld\t")).toBe("world");
  });

  test("splitTags splits and trims", () => {
    expect(splitTags("one, two,three")).toEqual(["one", "two", "three"]);
    expect(splitTags("  ,  ")).toEqual([]);
  });

  test("normalizeText property: lowercase trimmed", () => {
    fc.assert(
      fc.property(fc.string(), (value) => {
        const normalized = normalizeText(value);
        expect(normalized).toBe(normalized.trim());
        expect(normalized).toBe(normalized.toLowerCase());
      }),
    );
  });

  test("splitTags property: preserves non-empty tags", () => {
    const tagChar = fc.constantFrom("a", "b", "c", "1", "2", "3", "-", "_");
    fc.assert(
      fc.property(fc.array(fc.stringOf(tagChar, { minLength: 1, maxLength: 8 })), (tags) => {
        const joined = tags.map((tag) => `  ${tag}  `).join(",");
        expect(splitTags(joined)).toEqual(tags.map((tag) => tag.trim()).filter(Boolean));
      }),
    );
  });
});
