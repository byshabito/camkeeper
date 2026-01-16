import { describe, expect, test } from "bun:test";

import { renderProfileList } from "../../src/lib/ui/components/profileList.js";
import { createMockElement, installDomMock } from "../helpers/domMock.js";

describe("profileList", () => {
  test("renders profiles and handles clicks", async () => {
    const { restore } = installDomMock();
    const profileList = createMockElement("ul");
    const emptyState = createMockElement("div");
    const opened = [];
    const toggled = [];
    const selection = {
      isActive: () => false,
      isSelected: () => false,
      toggleSelection: (id) => toggled.push(id),
    };

    renderProfileList({
      profiles: [
        {
          id: "one",
          name: "Alpha",
          pinned: false,
          cams: [{ href: "https://twitch.tv/alpha", color: "#fff", title: "TW", iconSvg: "" }],
          tags: ["tag"],
          notePreview: "note",
        },
      ],
      elements: { profileList, emptyState },
      selection,
      getPinIconSvg: () => "<svg></svg>",
      onPinToggle: async (id) => toggled.push(`pin:${id}`),
      onOpenDetail: (id) => opened.push(id),
      emptyMessage: "No profiles",
    });

    const card = profileList.children[0];
    card.dispatchEvent({ type: "click" });
    const pinButton = card.children[0];
    await pinButton._listeners.get("click")[0]({ stopPropagation: () => {} });

    expect(opened).toEqual(["one"]);
    expect(toggled).toContain("pin:one");
    restore();
  });
});
