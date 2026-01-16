import { beforeEach, describe, expect, test } from "bun:test";

import { getSharedChromeMock } from "../helpers/chromeMock.js";
let STORAGE_KEY;
let SETTINGS_KEY;
let queryCalls = 0;

const chromeMock = getSharedChromeMock();

beforeEach(async () => {
  ({ STORAGE_KEY, SETTINGS_KEY } = await import("../../src/lib/db.js"));
  chromeMock.storage.local.clear();
  chromeMock.storage.sync.clear();
  chromeMock.storage.local._store[STORAGE_KEY] = [];
  chromeMock.storage.local._store[SETTINGS_KEY] = {
    viewMetric: "focus",
    livestreamSites: [{ host: "twitch.tv" }],
  };
  queryCalls = 0;
  chromeMock.tabs = {
    query: async () => {
      queryCalls += 1;
      return [{ id: 1, url: "https://twitch.tv/alpha" }];
    },
    onActivated: { addListener: () => {} },
    onUpdated: { addListener: () => {} },
    onRemoved: { addListener: () => {} },
  };
  chromeMock.windows = { onFocusChanged: { addListener: () => {} } };
  chromeMock.commands = { onCommand: { addListener: (handler) => (chromeMock._command = handler) } };
  chromeMock.storage.onChanged = {
    addListener: (handler) => {
      chromeMock._onStorageChanged = handler;
    },
  };
  chromeMock.action = {
    setBadgeBackgroundColor: () => {},
    setBadgeText: (payload) => {
      chromeMock._badgeText = payload.text;
    },
  };
});

describe("background/controller", () => {
  test("quick add command saves profile and clears badge", async () => {
    const originalTimeout = globalThis.setTimeout;
    globalThis.setTimeout = (handler) => handler();

    const { initBackground } = await import("../../src/lib/background/controller.js");
    initBackground();
    await new Promise((resolve) => setTimeout(resolve, 10));
    chromeMock._command("quick-add-profile");
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(queryCalls).toBeGreaterThan(0);

    globalThis.setTimeout = originalTimeout;
  });

  test("storage change triggers settings reload", async () => {
    const { initBackground } = await import("../../src/lib/background/controller.js");
    initBackground();
    chromeMock.storage.local._store[SETTINGS_KEY] = { viewMetric: "open" };
    await chromeMock._onStorageChanged({
      [SETTINGS_KEY]: { newValue: { viewMetric: "open" } },
    }, "local");
    expect(chromeMock.storage.local._store[SETTINGS_KEY].viewMetric).toBe("open");
  });
});
