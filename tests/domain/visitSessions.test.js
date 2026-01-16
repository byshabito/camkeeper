import { describe, expect, test } from "bun:test";

import {
  coerceSession,
  coerceSessionList,
  LEGACY_ACTIVE_VIEW_SESSION_STATE_KEY,
  parseVisitUrl,
  buildSession,
} from "../../src/domain/visitSessions.js";

const sites = { "twitch.tv": { host: "twitch.tv" } };

describe("domain/visitSessions", () => {
  test("coerceSession validates session shape", () => {
    expect(coerceSession({ tabId: 1, site: "twitch.tv", username: "alpha", startedAt: 1 })).toEqual({
      tabId: 1,
      site: "twitch.tv",
      username: "alpha",
      startedAt: 1,
    });
    expect(coerceSession({ tabId: "bad" })).toBeNull();
  });

  test("coerceSessionList filters invalid entries", () => {
    const list = coerceSessionList([
      { tabId: 1, site: "twitch.tv", username: "alpha", startedAt: 1 },
      { tabId: "bad" },
    ]);
    expect(list).toHaveLength(1);
  });

  test("parseVisitUrl delegates to parseUrl", () => {
    expect(parseVisitUrl("https://twitch.tv/alpha", sites)).toEqual({
      site: "twitch.tv",
      username: "alpha",
    });
  });

  test("buildSession returns null when parsed missing", () => {
    expect(buildSession({ tabId: 1, parsed: null, startedAt: 1 })).toBeNull();
  });

  test("LEGACY_ACTIVE_VIEW_SESSION_STATE_KEY is stable", () => {
    expect(LEGACY_ACTIVE_VIEW_SESSION_STATE_KEY).toBe("camkeeper_active_view_session_v1");
  });
});
