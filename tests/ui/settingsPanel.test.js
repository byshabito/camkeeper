import { beforeEach, describe, expect, test } from "bun:test";

import { getSharedChromeMock } from "../helpers/chromeMock.js";
import { createMockElement, installDomMock } from "../helpers/domMock.js";

const chromeMock = getSharedChromeMock();

beforeEach(() => {
  chromeMock.storage.local.clear();
  chromeMock.storage.sync.clear();
  chromeMock.runtime.getURL = (path) => path;
});

describe("settingsPanel", () => {
  test("loads settings and adds new site rows", async () => {
    chromeMock.storage.local._store.camkeeper_settings_v1 = {
      viewMetric: "open",
      livestreamSites: [{ host: "twitch.tv" }],
    };

    const elements = {
      addLivestreamSiteButton: createMockElement("button"),
      livestreamSitesList: createMockElement("div"),
      viewMetricSelect: createMockElement("select"),
      settingsFeedback: createMockElement("div"),
      backupFeedback: createMockElement("div"),
      exportButton: createMockElement("button"),
      importButton: createMockElement("button"),
      importInput: createMockElement("input"),
      bitcoinModal: createMockElement("div"),
      bitcoinModalCloseBottom: createMockElement("button"),
      bitcoinToast: createMockElement("div"),
      metaVersion: createMockElement("span"),
      metaRelease: createMockElement("span"),
      metaDeveloper: createMockElement("a"),
      metaSource: createMockElement("a"),
      metaLicense: createMockElement("a"),
    };

    const { restore } = installDomMock(elements);
    globalThis.document.createElement = (tagName) => createMockElement(tagName);
    globalThis.window = {
      setTimeout: (handler) => handler(),
      clearTimeout: () => {},
    };
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ version: "1.0.0" }),
    });

    const { initSettingsPanel } = await import(
      "../../src/ui/components/settingsPanel.js",
    );
    initSettingsPanel({ elements, allowFileImport: false });
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(elements.viewMetricSelect._listeners.get("change").length).toBe(1);

    elements.addLivestreamSiteButton.dispatchEvent({ type: "click" });
    expect(elements.livestreamSitesList.children.length).toBeGreaterThan(1);

  });

  test("import handles invalid JSON", async () => {
    chromeMock.storage.local._store.camkeeper_settings_v1 = { viewMetric: "open" };

    const elements = {
      importInput: createMockElement("input"),
      backupFeedback: createMockElement("div"),
      bitcoinModal: createMockElement("div"),
      bitcoinModalCloseBottom: createMockElement("button"),
      bitcoinToast: createMockElement("div"),
    };
    elements.importInput.files = [
      {
        text: async () => "not-json",
      },
    ];

    const { restore } = installDomMock(elements);
    globalThis.document.createElement = (tagName) => createMockElement(tagName);
    globalThis.window = {
      setTimeout: () => 1,
      clearTimeout: () => {},
    };
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ version: "1.0.0" }),
    });

    const { initSettingsPanel } = await import(
      "../../src/ui/components/settingsPanel.js",
    );
    elements.importInput.value = "chosen.json";
    initSettingsPanel({ elements, allowFileImport: true });
    elements.importInput.dispatchEvent({ type: "change" });
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(elements.importInput.value).toBe("");
  });

  test("export falls back to clipboard", async () => {
    chromeMock.storage.local._store.camkeeper_profiles_v1 = [
      { id: "one", name: "Alpha", cams: [{ site: "twitch.tv", username: "alpha" }], socials: [] },
    ];

    const elements = {
      exportButton: createMockElement("button"),
      backupFeedback: createMockElement("div"),
      bitcoinModal: createMockElement("div"),
      bitcoinModalCloseBottom: createMockElement("button"),
      bitcoinToast: createMockElement("div"),
    };

    const { restore } = installDomMock(elements);
    globalThis.document.createElement = (tagName) => createMockElement(tagName);
    globalThis.window = {
      setTimeout: () => 1,
      clearTimeout: () => {},
    };
    globalThis.URL = {
      createObjectURL: () => {
        throw new Error("fail");
      },
      revokeObjectURL: () => {},
    };
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ version: "1.0.0" }),
    });
    let copied = false;
    globalThis.navigator = {
      clipboard: {
        writeText: async () => {
          copied = true;
        },
      },
    };

    const { initSettingsPanel } = await import(
      "../../src/ui/components/settingsPanel.js",
    );
    initSettingsPanel({ elements, allowFileImport: false });
    elements.exportButton.dispatchEvent({ type: "click" });
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(copied).toBe(true);
  });
});
