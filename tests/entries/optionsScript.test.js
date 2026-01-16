import { describe, expect, test } from "bun:test";

import { getSharedChromeMock } from "../helpers/chromeMock.js";
import { createMockElement, installDomMock } from "../helpers/domMock.js";

const chromeMock = getSharedChromeMock();

describe("entries/options/script", () => {
  test("initializes without throwing", async () => {
    chromeMock.storage.local._store.camkeeper_settings_v1 = {
      viewMetric: "open",
      livestreamSites: [{ host: "twitch.tv" }],
    };
    chromeMock.runtime.getURL = (path) => path;

    const elements = {
      "export-button": createMockElement("button"),
      "import-button": createMockElement("button"),
      "import-input": createMockElement("input"),
      "view-metric": createMockElement("select"),
      "livestream-sites-list": createMockElement("div"),
      "add-livestream-site": createMockElement("button"),
      "settings-feedback": createMockElement("div"),
      "backup-feedback": createMockElement("div"),
      "bitcoin-donate-button": createMockElement("button"),
      "bitcoin-modal": createMockElement("div"),
      "bitcoin-modal-close-bottom": createMockElement("button"),
      "bitcoin-toast": createMockElement("div"),
      "meta-version": createMockElement("span"),
      "meta-release": createMockElement("span"),
      "meta-developer": createMockElement("a"),
      "meta-source": createMockElement("a"),
      "meta-license": createMockElement("a"),
    };

    const { restore } = installDomMock(elements);
    globalThis.window = {
      setTimeout: (handler) => handler(),
      clearTimeout: () => {},
    };
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ version: "1.0.0" }),
    });

    await import("../../src/entries/options/script.js");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(elements["view-metric"].value).toBe("open");
    restore();
  });
});
