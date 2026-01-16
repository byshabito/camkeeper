import { describe, expect, test } from "bun:test";

import { applySvg, clearContainer } from "../../src/lib/ui/components/domUtils.js";
import { createMockElement, installDomMock } from "../helpers/domMock.js";

describe("domUtils", () => {
  test("clearContainer removes children", () => {
    const parent = createMockElement("div");
    parent.appendChild(createMockElement("span"));
    parent.appendChild(createMockElement("span"));
    clearContainer(parent);
    expect(parent.children.length).toBe(0);
  });

  test("applySvg appends svg when valid", () => {
    const { restore } = installDomMock();
    const container = createMockElement("div");
    const applied = applySvg(container, "<svg></svg>");
    restore();
    expect(applied).toBe(true);
    expect(container.children.length).toBe(1);
  });

  test("applySvg returns false for empty input", () => {
    const { restore } = installDomMock();
    const container = createMockElement("div");
    const applied = applySvg(container, "");
    restore();
    expect(applied).toBe(false);
    expect(container.children.length).toBe(0);
  });
});
