import { describe, expect, test } from "bun:test";

import { renderProfileDetail } from "../../src/lib/ui/components/profileDetail.js";
import { createMockElement, installDomMock } from "../helpers/domMock.js";

describe("profileDetail", () => {
  test("renders details, cams, and socials", () => {
    const { restore } = installDomMock();
    const elements = {
      detailTitle: createMockElement("h1"),
      detailName: createMockElement("h2"),
      detailMeta: createMockElement("div"),
      detailPinButton: createMockElement("button"),
      detailCams: createMockElement("div"),
      detailSocials: createMockElement("div"),
      detailTags: createMockElement("div"),
      detailFolder: createMockElement("div"),
      detailNotes: createMockElement("div"),
    };

    renderProfileDetail({
      viewModel: {
        title: "Profile",
        name: "Alpha",
        updatedLabel: "Updated",
        pinned: true,
        folder: "Streamers",
        notes: "Notes",
        tags: ["one"],
        cams: [
          {
            url: "https://twitch.tv/alpha",
            color: "#fff",
            iconSvg: "",
            iconText: "TW",
            username: "alpha",
            viewLabel: "1h",
          },
        ],
        socials: [
          {
            url: "https://x.com/alpha",
            display: "alpha",
            iconSvg: "",
          },
        ],
      },
      elements,
      getPinIconSvg: () => "<svg></svg>",
      getFolderIconSvg: () => "<svg></svg>",
    });

    expect(elements.detailName.textContent).toBe("Alpha");
    expect(elements.detailCams.children.length).toBe(1);
    expect(elements.detailSocials.children.length).toBe(1);
    expect(elements.detailFolder.classList.contains("hidden")).toBe(false);
    restore();
  });
});
