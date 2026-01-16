import { beforeEach, describe, expect, test } from "bun:test";

import { initBackground } from "../../src/lib/background/controller.js";
import { getSharedChromeMock } from "../helpers/chromeMock.js";
import { STORAGE_KEY } from "../../src/lib/db.js";

const chromeMock = getSharedChromeMock();

beforeEach(() => {
  chromeMock.storage.local.clear();
  chromeMock.storage.sync.clear();
  chromeMock.storage.local._store[STORAGE_KEY] = [];
  chromeMock.tabs = {
    query: async () => [{ id: 1, url: "https://twitch.tv/alpha" }],
    onActivated: { addListener: () => {} },
    onUpdated: { addListener: () => {} },
    onRemoved: { addListener: () => {} },
  };
  chromeMock.windows = { onFocusChanged: { addListener: () => {} } };
  chromeMock.commands = { onCommand: { addListener: (handler) => (chromeMock._command = handler) } };
  chromeMock.storage.onChanged = { addListener: () => {} };
  chromeMock.action = {
    setBadgeBackgroundColor: () => {},
    setBadgeText: () => {},
  };
});

describe("background/controller", () => {
  test("quick add command saves profile", async () => {
    initBackground();
    chromeMock._command("quick-add-profile");
    await new Promise((resolve) => setTimeout(resolve, 0));
    const profiles = chromeMock.storage.local._store[STORAGE_KEY];
    expect(profiles.length).toBe(1);
    expect(profiles[0].cams[0].username).toBe("alpha");
  });
});
