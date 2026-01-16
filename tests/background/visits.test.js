import { beforeEach, describe, expect, test } from "bun:test";

import { getSharedChromeMock } from "../helpers/chromeMock.js";

const chromeMock = getSharedChromeMock();

const { initVisitTracking } = await import("../../src/background/visits.js");
const { STORAGE_KEY } = await import("../../src/repo/db.js");

beforeEach(() => {
  chromeMock.storage.local.clear();
  chromeMock.storage.sync.clear();
  chromeMock.storage.local._store[STORAGE_KEY] = [
    {
      id: "one",
      name: "Alpha",
      cams: [{ site: "twitch.tv", username: "alpha", viewMs: 0, viewHistory: [] }],
    },
  ];
  chromeMock.tabs = {
    get: (tabId, callback) => callback({ id: tabId, url: "https://twitch.tv/alpha", active: true }),
    query: (_query, callback) => callback([{ id: 1, url: "https://twitch.tv/alpha", active: true }]),
  };
  chromeMock.windows = { WINDOW_ID_NONE: -1 };
});

describe("background/visits", () => {
  test("tracks session in focus mode", async () => {
    const state = { activeTabId: null };
    const logMessages = [];
    const tracking = initVisitTracking(state, (message) => logMessages.push(message));
    const originalNow = Date.now;
    let now = 1000;
    Date.now = () => now;

    await tracking.onTabActivated({ tabId: 1, windowId: 1 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    now = 3000;
    await tracking.onTabRemoved(1);

    Date.now = originalNow;
    const profiles = chromeMock.storage.local._store[STORAGE_KEY];
    const cam = profiles[0].cams[0];
    expect(cam.viewMs).toBeGreaterThan(0);
    expect(cam.viewHistory.length).toBe(1);
    expect(logMessages.length).toBeGreaterThan(0);
  });

  test("switches mode to open and syncs", async () => {
    const state = { activeTabId: null };
    const tracking = initVisitTracking(state, () => {});
    const originalNow = Date.now;
    let now = 1000;
    Date.now = () => now;

    await tracking.setMode("open");
    await tracking.onTabUpdated(1, { status: "complete" }, { id: 1, url: "https://twitch.tv/alpha" });
    now = 4000;
    await tracking.onTabRemoved(1);

    Date.now = originalNow;
    const profiles = chromeMock.storage.local._store[STORAGE_KEY];
    const cam = profiles[0].cams[0];
    expect(cam.viewMs).toBeGreaterThan(0);
  });
});
