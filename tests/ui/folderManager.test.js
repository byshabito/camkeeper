import { describe, expect, test } from "bun:test";

import { renderFolderManager } from "../../src/lib/ui/components/folderManager.js";
import { createMockElement, installDomMock } from "../helpers/domMock.js";

describe("folderManager", () => {
  test("renders folders and triggers actions", async () => {
    const { restore } = installDomMock();
    const folderList = createMockElement("div");
    const folderEmpty = createMockElement("div");
    const renamed = [];
    const deleted = [];
    const reordered = [];

    renderFolderManager({
      folders: [{ key: "fav", name: "Favorites", count: 2 }],
      elements: { folderList, folderEmpty },
      onRename: (folder, nextValue) => renamed.push([folder.name, nextValue]),
      onDelete: (folder) => deleted.push(folder.name),
      onReorder: (source, target) => reordered.push([source, target]),
    });

    const row = folderList.children[0];
    const input = row.querySelector("input");
    input.value = "Favs";
    input.blur();
    const deleteButton = row.querySelector("button");
    deleteButton.dispatchEvent({ type: "click" });

    const dataTransfer = {
      setData: () => {},
      getData: () => "fav",
      effectAllowed: "",
      setDragImage: () => {},
    };
    row.dispatchEvent({ type: "drop", dataTransfer, preventDefault: () => {} });

    expect(renamed[0]).toEqual(["Favorites", "Favs"]);
    expect(deleted).toEqual(["Favorites"]);
    expect(reordered[0]).toEqual(["fav", "fav"]);
    restore();
  });
});
