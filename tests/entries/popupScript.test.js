import { describe, expect, test } from "bun:test";

import { getSharedChromeMock } from "../helpers/chromeMock.js";
import { createMockElement, installDomMock } from "../helpers/domMock.js";

const chromeMock = getSharedChromeMock();

function createElements(ids) {
  return ids.reduce((acc, id) => {
    acc[id] = createMockElement("div");
    return acc;
  }, {});
}

describe("entries/popup/script", () => {
  test("initializes without throwing", async () => {
    chromeMock.runtime.getURL = (path) => path;
    chromeMock.tabs = { query: (_query, callback) => callback([]) };

    const elements = createElements([
      "list-view",
      "form-view",
      "detail-view",
      "profile-list",
      "search-input",
      "sort-select",
      "empty-state",
      "folder-view",
      "settings-view",
      "folder-back",
      "folder-list",
      "folder-empty",
      "folder-manager-button",
      "select-button",
      "add-button",
      "back-button",
      "cancel-button",
      "delete-button",
      "detail-back",
      "detail-pin",
      "detail-edit",
      "form-title",
      "form-error",
      "profile-form",
      "attach-field",
      "attach-select",
      "name-input",
      "tags-input",
      "folder-select",
      "folder-input",
      "notes-input",
      "cam-rows",
      "social-rows",
      "add-cam",
      "add-social",
      "detail-title",
      "detail-name",
      "detail-meta",
      "detail-cams",
      "detail-socials",
      "detail-tags",
      "detail-folder",
      "detail-notes",
      "bulk-bar",
      "bulk-count",
      "bulk-merge",
      "bulk-delete",
      "bulk-cancel",
      "folder-filter",
      "settings-toggle",
      "export-button",
      "import-input",
      "view-metric",
      "settings-feedback",
      "bitcoin-donate-button",
      "bitcoin-modal",
      "bitcoin-modal-close-bottom",
      "bitcoin-toast",
      "meta-version",
      "meta-release",
      "meta-developer",
      "meta-source",
      "meta-license",
    ]);

    const searchSort = createMockElement("div");
    searchSort.classList.add("search-sort");

    const { document, restore } = installDomMock({
      ...elements,
      searchSort,
    });
    document.readyState = "complete";
    globalThis.window = {
      location: { search: "" },
      sessionStorage: {
        getItem: () => null,
        setItem: () => {},
      },
    };
    globalThis.fetch = async () => ({
      ok: true,
      text: async () => "<svg></svg>",
      json: async () => ({ version: "1.0.0" }),
    });

    await import("../../src/entries/popup/script.js");

    expect(elements["profile-list"]).toBeTruthy();
    restore();
  });
});
