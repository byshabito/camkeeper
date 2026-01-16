import { beforeEach, describe, expect, test } from "bun:test";
import fc from "fast-check";

import { setSitesFromSettings } from "../../src/lib/domain/sites.js";
import {
  buildSocialUrl,
  normalizeWebsiteHandle,
  parseCamInput,
  parseSocialInput,
  parseSocialUrl,
  parseUrl,
} from "../../src/lib/domain/urls.js";

describe("urls", () => {
  beforeEach(() => {
    setSitesFromSettings(["twitch.tv", "youtube.com"]);
  });

  test("normalizeWebsiteHandle handles URLs and strings", () => {
    expect(normalizeWebsiteHandle("https://www.Example.com/Path/")).toBe("example.com/path");
    expect(normalizeWebsiteHandle("Example.com/Path")).toBe("example.com/path");
  });

  test("parseUrl extracts site and username", () => {
    expect(parseUrl("https://twitch.tv/Foo")).toEqual({
      site: "twitch.tv",
      username: "foo",
    });
    expect(parseUrl("https://www.youtube.com/@Creator")).toEqual({
      site: "youtube.com",
      username: "creator",
    });
    expect(parseUrl("https://www.youtube.com/channel/ABC")).toEqual({
      site: "youtube.com",
      username: "channel/abc",
    });
  });

  test("parseSocialUrl recognizes platforms", () => {
    expect(parseSocialUrl("https://instagram.com/MyHandle")).toEqual({
      platform: "instagram",
      handle: "myhandle",
    });
    expect(parseSocialUrl("https://threads.net/@User")).toEqual({
      platform: "threads",
      handle: "user",
    });
    expect(parseSocialUrl("https://t.me/MyGroup")).toEqual({
      platform: "telegram",
      handle: "mygroup",
    });
    expect(parseSocialUrl("https://x.com/SomeUser")).toEqual({
      platform: "x",
      handle: "someuser",
    });
    expect(parseSocialUrl("https://www.youtube.com/@Creator")).toEqual({
      platform: "youtube",
      handle: "creator",
    });
    expect(parseSocialUrl("https://www.tiktok.com/@Creator")).toEqual({
      platform: "tiktok",
      handle: "creator",
    });
  });

  test("buildSocialUrl builds platform URLs", () => {
    expect(buildSocialUrl({ platform: "x", handle: "someone" })).toBe("https://x.com/someone");
    expect(buildSocialUrl({ platform: "website", handle: "example.com" })).toBe(
      "https://example.com",
    );
  });

  test("parseCamInput handles urls and raw handles", () => {
    expect(parseCamInput("https://twitch.tv/Foo")).toEqual({
      site: "twitch.tv",
      username: "foo",
    });
    expect(parseCamInput("@Creator")).toEqual({
      site: null,
      username: "creator",
    });
  });

  test("parseSocialInput handles urls and raw handles", () => {
    expect(parseSocialInput("https://x.com/Handle")).toEqual({
      platform: "x",
      handle: "handle",
    });
    expect(parseSocialInput("@Handle")).toEqual({
      platform: null,
      handle: "handle",
    });
  });

  test("buildSocialUrl property: roundtrips for known platforms", () => {
    const handleChar = fc.constantFrom("a", "b", "c", "1", "2", "3", "_", "-");
    const platforms = ["instagram", "threads", "telegram", "x", "youtube", "tiktok"];
    fc.assert(
      fc.property(fc.stringOf(handleChar, { minLength: 1, maxLength: 12 }), (handle) => {
        platforms.forEach((platform) => {
          const url = buildSocialUrl({ platform, handle });
          const parsed = parseSocialUrl(url);
          expect(parsed).toEqual({ platform, handle: handle.toLowerCase() });
        });
      }),
    );
  });
});
