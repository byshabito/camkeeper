import { describe, expect, test } from "bun:test";

import {
  createListControlHandlers,
  createSearchHoverHandlers,
  renderFolderFilter,
} from "../../src/lib/ui/components/listControls.js";
import { createMockElement, installDomMock } from "../helpers/domMock.js";

describe("listControls", () => {
  test("createListControlHandlers wires change handlers", () => {
    const searchInput = createMockElement("input");
    const sortSelect = createMockElement("select");
    const folderFilter = createMockElement("select");
    const values = [];

    const handlers = createListControlHandlers({
      elements: { searchInput, sortSelect, folderFilter },
      onQueryChange: (value) => values.push(`q:${value}`),
      onSortChange: (value) => values.push(`s:${value}`),
      onFolderFilterChange: (value) => values.push(`f:${value}`),
    });

    handlers.forEach(({ element, event, handler }) => {
      element.addEventListener(event, handler);
    });

    searchInput.value = "alpha";
    searchInput.dispatchEvent({ type: "input", target: searchInput });
    sortSelect.value = "recent";
    sortSelect.dispatchEvent({ type: "change", target: sortSelect });
    folderFilter.value = "Favorites";
    folderFilter.dispatchEvent({ type: "change", target: folderFilter });

    expect(values).toEqual(["q:alpha", "s:recent", "f:Favorites"]);
  });

  test("createSearchHoverHandlers toggles class", () => {
    const searchSort = createMockElement("div");
    searchSort.classList.add("search-sort");
    const searchInput = createMockElement("input");
    const { document, restore } = installDomMock({
      searchSort,
    });
    document.activeElement = null;

    const handlers = createSearchHoverHandlers({ searchSort, searchInput });
    handlers.forEach(({ element, event, handler }) => element.addEventListener(event, handler));

    searchInput.dispatchEvent({ type: "mouseenter", target: searchInput });
    expect(searchSort.classList.contains("search-active")).toBe(true);

    searchInput.dispatchEvent({ type: "blur", target: searchInput });
    expect(searchSort.classList.contains("search-active")).toBe(false);

    restore();
  });

  test("renderFolderFilter renders options", () => {
    const { restore } = installDomMock();
    const folderFilter = createMockElement("select");

    renderFolderFilter({
      elements: { folderFilter },
      options: [
        { value: "", label: "All" },
        { value: "A", label: "A" },
      ],
      value: "A",
    });

    expect(folderFilter.children.length).toBe(2);
    expect(folderFilter.value).toBe("A");
    restore();
  });
});
