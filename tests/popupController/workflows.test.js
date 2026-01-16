import { beforeEach, describe, expect, test } from "bun:test";

import { getSharedChromeMock } from "../helpers/chromeMock.js";
import { createMockElement, installDomMock } from "../helpers/domMock.js";

const chromeMock = getSharedChromeMock();
let SETTINGS_KEY;
let STORAGE_KEY;
let queryCalls = 0;

function createElements(ids) {
  return ids.reduce((acc, id) => {
    acc[id] = createMockElement("div");
    return acc;
  }, {});
}

function setupPopupElements() {
  const ids = [
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
  ];

  const elements = createElements(ids);
  const searchSort = createMockElement("div");
  searchSort.classList.add("search-sort");
  const settingsIcon = createMockElement("span");
  settingsIcon.classList.add("settings-icon");
  const overviewIcon = createMockElement("span");
  overviewIcon.classList.add("overview-icon");
  elements.settingsToggle.appendChild(settingsIcon);
  elements.settingsToggle.appendChild(overviewIcon);
  elements.profileForm.addEventListener = () => {};

  return {
    domElements: {
      ...elements,
      searchSort,
    },
    controllerElements: {
      ...elements,
      searchSort,
    },
  };
}

beforeEach(async () => {
  ({ SETTINGS_KEY, STORAGE_KEY } = await import("../../src/repo/db.js"));
  chromeMock.storage.local.clear();
  chromeMock.storage.sync.clear();
  chromeMock.storage.local._store[SETTINGS_KEY] = {
    viewMetric: "focus",
    livestreamSites: [{ host: "twitch.tv" }],
  };
  chromeMock.storage.local._store[STORAGE_KEY] = [];
  chromeMock.runtime.getURL = (path) => path;
  chromeMock.runtime.openOptionsPage = () => {};
  queryCalls = 0;
  chromeMock.tabs = {
    query: (_query, callback) => {
      queryCalls += 1;
      if (typeof callback === "function") {
        callback([]);
        return undefined;
      }
      return Promise.resolve([]);
    },
  };
});

describe("popupController workflows", () => {
  test("add button queries active tab", async () => {
    const { initPopupController } = await import(
      "../../src/ui/controllers/popupController.js",
    );
    const elements = setupPopupElements();
    const { restore } = installDomMock(elements.domElements);

    globalThis.window = {
      location: { search: "" },
      sessionStorage: { getItem: () => null, setItem: () => {} },
    };
    globalThis.fetch = async () => ({
      ok: true,
      text: async () => "<svg></svg>",
      json: async () => ({ version: "1.0.0" }),
    });

    initPopupController({ elements: elements.controllerElements });
    await new Promise((resolve) => setTimeout(resolve, 20));
    elements.controllerElements.addButton.dispatchEvent({ type: "click" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(queryCalls).toBeGreaterThan(0);
    restore();
  });

  test("embedded settings toggle shows settings view", async () => {
    const { initPopupController } = await import(
      "../../src/ui/controllers/popupController.js",
    );
    const elements = setupPopupElements();
    elements.controllerElements.settingsView.classList.add("hidden");
    const { restore } = installDomMock(elements.domElements);

    globalThis.window = {
      location: { search: "?embed=1" },
      sessionStorage: { getItem: () => null, setItem: () => {} },
    };
    globalThis.fetch = async () => ({
      ok: true,
      text: async () => "<svg></svg>",
      json: async () => ({ version: "1.0.0" }),
    });

    initPopupController({ elements: elements.controllerElements });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(elements.controllerElements.settingsView.classList.contains("hidden")).toBe(false);

    elements.controllerElements.settingsToggle.dispatchEvent({ type: "click" });
    expect(elements.controllerElements.settingsView.classList.contains("hidden")).toBe(true);
    restore();
  });

  test("folder manager button switches view", async () => {
    const { initPopupController } = await import(
      "../../src/ui/controllers/popupController.js",
    );
    const elements = setupPopupElements();
    elements.controllerElements.folderView.classList.add("hidden");
    const { restore } = installDomMock(elements.domElements);

    globalThis.window = {
      location: { search: "" },
      sessionStorage: { getItem: () => null, setItem: () => {} },
    };
    globalThis.fetch = async () => ({
      ok: true,
      text: async () => "<svg></svg>",
      json: async () => ({ version: "1.0.0" }),
    });

    initPopupController({ elements: elements.controllerElements });
    await new Promise((resolve) => setTimeout(resolve, 20));
    elements.controllerElements.folderManagerButton.dispatchEvent({ type: "click" });

    expect(elements.controllerElements.folderView.classList.contains("hidden")).toBe(false);
    restore();
  });
});
