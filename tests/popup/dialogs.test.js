import { describe, expect, test } from "bun:test";

import { createPopupDialogs } from "../../src/lib/popup/dialogs.js";
import { createMockElement, installDomMock } from "../helpers/domMock.js";

function createConfirmElements() {
  return {
    "confirm-modal": createMockElement("div"),
    "confirm-title": createMockElement("div"),
    "confirm-message": createMockElement("div"),
    "confirm-list": createMockElement("ul"),
    "confirm-cancel": createMockElement("button"),
    "confirm-accept": createMockElement("button"),
  };
}

describe("popup/dialogs", () => {
  test("confirmDeleteProfile resolves false on cancel", async () => {
    const elements = createConfirmElements();
    const { restore } = installDomMock(elements);

    const dialogs = createPopupDialogs();
    const promise = dialogs.confirmDeleteProfile("Alpha");
    elements["confirm-cancel"].onclick();
    const result = await promise;

    expect(result).toBe(false);
    restore();
  });
});
