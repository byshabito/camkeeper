import { describe, expect, test } from "bun:test";

import { getSharedChromeMock } from "../helpers/chromeMock.js";
import { createMockElement, installDomMock } from "../helpers/domMock.js";
let STORAGE_KEY;

const chromeMock = getSharedChromeMock();

function createElements(ids) {
  return ids.reduce((acc, id) => {
    acc[id] = createMockElement("div");
    return acc;
  }, {});
}

describe("popupController", () => {
  test("initializes with minimal DOM", async () => {
    ({ STORAGE_KEY } = await import("../../src/repo/db.js"));
    chromeMock.storage.local._store[STORAGE_KEY] = [];
    chromeMock.tabs = { query: (_query, callback) => callback([]) };
    chromeMock.runtime.openOptionsPage = () => {};
    chromeMock.runtime.getURL = (path) => path;

    const elements = createElements([
      "listView",
      "formView",
      "detailView",
      "profileList",
      "searchInput",
      "sortSelect",
      "emptyState",
      "folderView",
      "settingsView",
      "folderBackButton",
      "folderList",
      "folderEmpty",
      "folderManagerButton",
      "selectButton",
      "addButton",
      "backButton",
      "cancelButton",
      "deleteButton",
      "detailBackButton",
      "detailPinButton",
      "detailEditButton",
      "formTitle",
      "formError",
      "profileForm",
      "attachField",
      "attachSelect",
      "nameInput",
      "tagsInput",
      "folderSelect",
      "folderInput",
      "notesInput",
      "camRows",
      "socialRows",
      "addCamButton",
      "addSocialButton",
      "detailTitle",
      "detailName",
      "detailMeta",
      "detailCams",
      "detailSocials",
      "detailTags",
      "detailFolder",
      "detailNotes",
      "bulkBar",
      "bulkCount",
      "bulkMerge",
      "bulkDelete",
      "bulkCancel",
      "folderFilter",
      "settingsToggle",
      "exportButton",
      "importInput",
      "viewMetricSelect",
      "settingsFeedback",
      "bitcoinDonateButton",
      "bitcoinModal",
      "bitcoinModalCloseBottom",
      "bitcoinToast",
      "metaVersion",
      "metaRelease",
      "metaDeveloper",
      "metaSource",
      "metaLicense",
    ]);

    const settingsIcon = createMockElement("span");
    settingsIcon.classList.add("settings-icon");
    const overviewIcon = createMockElement("span");
    overviewIcon.classList.add("overview-icon");
    elements.settingsToggle.appendChild(settingsIcon);
    elements.settingsToggle.appendChild(overviewIcon);

    const searchSort = createMockElement("div");
    searchSort.classList.add("search-sort");

    const { document, restore } = installDomMock({
      ...elements,
      searchSort,
    });
    document.readyState = "loading";
    document.addEventListener = () => {};

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

    const { initPopupController } = await import(
      "../../src/ui/controllers/popupController.js",
    );
    initPopupController({
      elements: {
        ...elements,
        searchSort,
      },
    });

    expect(elements.profileList).toBeTruthy();
    restore();
  });
});
