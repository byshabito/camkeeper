import { describe, expect, test } from "bun:test";

import {
  formatDuration,
  formatSocialHandle,
  normalizeSocialHandle,
  orderFolderNames,
  selectFolderOptionsViewModel,
  selectProfileListViewModel,
  truncateText,
} from "../../src/lib/ui/selectors/popupSelectors.js";

import { buildSites } from "../../src/lib/domain/sites.js";

const sites = buildSites(["twitch.tv"]);

function getPlatformIconSvg() {
  return "<svg/>";
}

function getSocialIconSvg() {
  return "<svg/>";
}

describe("popupSelectors", () => {
  test("orderFolderNames respects preferred order", () => {
    const ordered = orderFolderNames(["B", "A"], ["a"]);
    expect(ordered).toEqual(["A", "B"]);
  });

  test("selectProfileListViewModel builds cam links", () => {
    const profiles = [
      {
        id: "one",
        name: "Alpha",
        cams: [{ site: "twitch.tv", username: "alpha", viewMs: 10 }],
        socials: [],
      },
    ];
    const model = selectProfileListViewModel(profiles, {
      query: "",
      folderKey: "",
      sortKey: "name",
      sites,
      getPlatformIconSvg,
    });
    expect(model.profiles[0].cams[0].href).toContain("twitch.tv");
  });

  test("selectFolderOptionsViewModel builds defaults", () => {
    const profiles = [{ id: "one", name: "A", folder: "Streamers" }];
    const model = selectFolderOptionsViewModel({
      profiles,
      preferredOrder: [],
      selectedFilter: "",
      preferredFilter: "",
      currentFolder: "",
    });
    expect(model.filterOptions[1].label).toBe("Streamers");
  });

  test("formatDuration converts to human labels", () => {
    expect(formatDuration(90 * 60 * 1000)).toBe("1h 30m");
    expect(formatDuration(2 * 24 * 60 * 60 * 1000)).toBe("2d");
  });

  test("formatSocialHandle and normalizeSocialHandle", () => {
    expect(formatSocialHandle({ platform: "website", handle: "https://example.com" })).toBe(
      "example.com",
    );
    expect(normalizeSocialHandle("x", "@Handle")).toBe("handle");
  });

  test("truncateText respects length", () => {
    expect(truncateText("Hello", 10)).toBe("Hello");
    expect(truncateText("Hello world", 6)).toBe("Hello...");
  });
});
