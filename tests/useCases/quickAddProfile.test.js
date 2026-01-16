import { beforeEach, describe, expect, test } from "bun:test";

import { getSharedChromeMock } from "../helpers/chromeMock.js";
import { getSiteRegistry, setSiteRegistry } from "../../src/domain/siteRegistry.js";

const chromeMock = getSharedChromeMock();
const { quickAddProfile } = await import("../../src/useCases/quickAddProfile.js");
const { STORAGE_KEY } = await import("../../src/repo/db.js");

beforeEach(() => {
  chromeMock.storage.local.clear();
  chromeMock.storage.sync.clear();
  chromeMock.storage.local._store[STORAGE_KEY] = [];
  setSiteRegistry(["twitch.tv"]);
});

describe("useCases/quickAddProfile", () => {
  test("adds profile for matching tab", async () => {
    const result = await quickAddProfile({
      tab: { url: "https://twitch.tv/alpha" },
      sites: { "twitch.tv": {} },
      now: () => 123,
    });
    expect(result.added).toBe(true);
    const stored = chromeMock.storage.local._store[STORAGE_KEY];
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe("alpha");
    expect(stored[0].createdAt).toBe(123);
  });

  test("returns duplicate when existing", async () => {
    chromeMock.storage.local._store[STORAGE_KEY] = [
      { id: "one", name: "Alpha", cams: [{ site: "twitch.tv", username: "alpha" }] },
    ];
    const result = await quickAddProfile({
      tab: { url: "https://twitch.tv/alpha" },
      sites: { "twitch.tv": {} },
    });
    expect(result.added).toBe(false);
    expect(result.reason).toBe("duplicate");
  });

  test("returns no_match when url missing", async () => {
    const result = await quickAddProfile({ tab: { url: "https://example.com" }, sites: {} });
    expect(result.added).toBe(false);
    expect(result.reason).toBe("no_match");
  });
});
