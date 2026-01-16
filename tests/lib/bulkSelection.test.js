import { describe, expect, test } from "bun:test";

import { createBulkSelection } from "../../src/lib/bulkSelection.js";

function createClassList() {
  const classes = new Set(["hidden"]);
  return {
    add: (name) => classes.add(name),
    remove: (name) => classes.delete(name),
    toggle: (name, force) => {
      const enabled = force ?? !classes.has(name);
      if (enabled) classes.add(name);
      else classes.delete(name);
    },
    contains: (name) => classes.has(name),
  };
}

function createButton() {
  const button = {
    disabled: false,
    onclick: null,
    addEventListener(event, handler) {
      if (event === "click") button.onclick = handler;
    },
    click() {
      if (button.onclick) button.onclick();
    },
  };
  return button;
}

describe("bulkSelection", () => {
  test("toggles selection state and buttons", () => {
    const bulkBar = { classList: createClassList() };
    const bulkCount = { textContent: "" };
    const bulkMerge = createButton();
    const bulkDelete = createButton();
    const bulkCancel = createButton();
    const selectButton = createButton();
    const mergedIds = [];
    const deletedIds = [];

    const selection = createBulkSelection({
      bulkBar,
      bulkCount,
      bulkMerge,
      bulkDelete,
      bulkCancel,
      selectButton,
      onMerge: (ids) => mergedIds.push(ids),
      onDelete: (ids) => deletedIds.push(ids),
      onRender: () => {},
    });

    expect(bulkBar.classList.contains("hidden")).toBe(true);
    selectButton.click();
    expect(bulkBar.classList.contains("hidden")).toBe(false);
    expect(bulkMerge.disabled).toBe(true);
    expect(bulkDelete.disabled).toBe(true);

    selection.toggleSelection("a");
    selection.toggleSelection("b");
    expect(bulkMerge.disabled).toBe(false);
    expect(bulkDelete.disabled).toBe(false);

    bulkMerge.click();
    expect(mergedIds[0]).toEqual(["a", "b"]);

    bulkDelete.click();
    expect(deletedIds[0]).toEqual(["a", "b"]);

    bulkCancel.click();
    expect(selection.isActive()).toBe(false);
    expect(selection.getSelectedIds()).toEqual([]);
  });
});
