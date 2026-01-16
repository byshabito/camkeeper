import { describe, expect, test } from "bun:test";

import { getSharedChromeMock } from "../helpers/chromeMock.js";
import { STORAGE_KEY } from "../../src/lib/db.js";

const chromeMock = getSharedChromeMock();

describe("entries/background/index", () => {
  test("initializes background listeners", async () => {
    chromeMock.storage.local._store[STORAGE_KEY] = [];
    chromeMock.tabs = {
      query: async () => [{ id: 1, url: "https://twitch.tv/alpha" }],
      onActivated: { addListener: (handler) => (chromeMock._onActivated = handler) },
      onUpdated: { addListener: () => {} },
      onRemoved: { addListener: () => {} },
    };
    chromeMock.windows = { onFocusChanged: { addListener: () => {} }, WINDOW_ID_NONE: -1 };
    chromeMock.commands = { onCommand: { addListener: () => {} } };
    chromeMock.storage.onChanged = { addListener: () => {} };
    chromeMock.action = { setBadgeBackgroundColor: () => {}, setBadgeText: () => {} };

    await import("../../src/entries/background/index.js");

    expect(typeof chromeMock._onActivated).toBe("function");
  });
});
