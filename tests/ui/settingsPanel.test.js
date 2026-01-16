import { beforeEach, describe, expect, test } from "bun:test";

import { initSettingsPanel } from "../../src/lib/ui/components/settingsPanel.js";
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
      bitcoinModal: createMockElement("div"),
      bitcoinModalCloseBottom: createMockElement("button"),
      bitcoinToast: createMockElement("div"),
      metaVersion: createMockElement("span"),
      metaRelease: createMockElement("span"),
      metaDeveloper: createMockElement("a"),
      metaSource: createMockElement("a"),
      metaLicense: createMockElement("a"),
    };

    const { document, restore } = installDomMock(elements);
    globalThis.window = {
      setTimeout: (handler) => handler(),
      clearTimeout: () => {},
    };
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ version: "1.0.0" }),
    });

    initSettingsPanel({ elements, allowFileImport: false });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(elements.viewMetricSelect.value).toBe("open");

    elements.addLivestreamSiteButton.dispatchEvent({ type: "click" });
    expect(elements.livestreamSitesList.children.length).toBeGreaterThan(1);

    restore();
  });
});
