import { beforeEach, describe, expect, test } from "bun:test";

import { getSharedChromeMock } from "../helpers/chromeMock.js";
import { createMockElement, installDomMock } from "../helpers/domMock.js";

const chromeMock = getSharedChromeMock();

beforeEach(() => {
  chromeMock.storage.local.clear();
  chromeMock.runtime.getURL = (path) => path;
  chromeMock.storage.local._store.camkeeper_settings_v1 = {
    viewMetric: "focus",
    livestreamSites: [{ host: "twitch.tv" }],
  };
});

describe("optionsController", () => {
  test("initializes settings panel", async () => {
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

    const { initOptionsController } = await import(
      "../../src/lib/ui/controllers/optionsController.js",
    );
    initOptionsController();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(elements["add-livestream-site"]._listeners.get("click").length).toBe(1);
    restore();
  });
});
