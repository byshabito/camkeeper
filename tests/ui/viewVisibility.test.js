import { describe, expect, test } from "bun:test";

import { setSettingsToggleState, setViewVisibility } from "../../src/lib/ui/components/viewVisibility.js";

function createClassList() {
  const classes = new Set();
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

function createView() {
  return { classList: createClassList() };
}

describe("viewVisibility", () => {
  test("setViewVisibility toggles hidden classes", () => {
    const views = {
      listView: createView(),
      formView: createView(),
      detailView: createView(),
      folderView: createView(),
      settingsView: createView(),
    };
    setViewVisibility(views, "detail");
    expect(views.detailView.classList.contains("hidden")).toBe(false);
    expect(views.listView.classList.contains("hidden")).toBe(true);
  });

  test("setSettingsToggleState updates labels", () => {
    const settingsToggle = {
      classList: createClassList(),
      attributes: {},
      setAttribute(key, value) {
        this.attributes[key] = value;
      },
    };
    const settingsIcon = { classList: createClassList() };
    const overviewIcon = { classList: createClassList() };

    setSettingsToggleState(
      { settingsToggle, settingsIcon, overviewIcon, isEmbedded: false },
      "overview",
    );

    expect(settingsToggle.attributes["aria-label"]).toBe("Overview");
    expect(overviewIcon.classList.contains("hidden")).toBe(false);
  });
});
