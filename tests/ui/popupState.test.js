import { describe, expect, test } from "bun:test";

import { createPopupState } from "../../src/ui/state/popupState.js";

describe("popupState", () => {
  test("stores and retrieves values", () => {
    const state = createPopupState({ listSortKey: "recent" });
    expect(state.getValue("listSortKey")).toBe("recent");
    state.setValue("listSortKey", "month");
    expect(state.getValue("listSortKey")).toBe("month");
  });

  test("set merges patches", () => {
    const state = createPopupState();
    state.set({ listQuery: "alpha", listFolderFilter: "Favorites" });
    expect(state.getSnapshot()).toMatchObject({
      listQuery: "alpha",
      listFolderFilter: "Favorites",
    });
  });
});
