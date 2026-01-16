import { describe, expect, test } from "bun:test";

import { createViewStateMachine } from "../../src/lib/ui/state/viewState.js";

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

describe("viewState", () => {
  test("go updates state and visibility", () => {
    const views = {
      listView: createView(),
      formView: createView(),
      detailView: createView(),
      folderView: createView(),
      settingsView: createView(),
    };
    const state = {
      snapshot: {},
      getValue: (key) => state.snapshot[key],
      set: (patch) => Object.assign(state.snapshot, patch),
      setValue: (key, value) => {
        state.snapshot[key] = value;
      },
    };
    const settingsUi = {
      settingsToggle: { classList: createClassList(), setAttribute: () => {} },
      settingsIcon: { classList: createClassList() },
      overviewIcon: { classList: createClassList() },
      isEmbedded: false,
    };
    const selection = { setSelectMode: () => {} };
    const calls = [];

    const machine = createViewStateMachine({
      views,
      settingsUi,
      state,
      selection,
      setViewVisibility: (nextViews, active) => {
        calls.push(active);
        Object.values(nextViews).forEach((view) => view.classList.toggle("hidden", true));
        if (active === "list") nextViews.listView.classList.toggle("hidden", false);
      },
      setSettingsToggleState: () => {},
      onView: {
        list: () => calls.push("list"),
      },
    });

    machine.go("list");
    expect(calls).toContain("list");
    expect(views.listView.classList.contains("hidden")).toBe(false);
  });

  test("toggleSettings restores last view", () => {
    const views = {
      listView: createView(),
      formView: createView(),
      detailView: createView(),
      folderView: createView(),
      settingsView: createView(),
    };
    const state = {
      snapshot: { lastNonSettingsView: "list" },
      getValue: (key) => state.snapshot[key],
      set: (patch) => Object.assign(state.snapshot, patch),
    };
    const settingsUi = {
      settingsToggle: { classList: createClassList(), setAttribute: () => {} },
      settingsIcon: { classList: createClassList() },
      overviewIcon: { classList: createClassList() },
      isEmbedded: false,
    };

    views.settingsView.classList.toggle("hidden", true);
    const machine = createViewStateMachine({
      views,
      settingsUi,
      state,
      selection: null,
      setViewVisibility: (nextViews, active) => {
        nextViews.settingsView.classList.toggle("hidden", active !== "settings");
        nextViews.listView.classList.toggle("hidden", active !== "list");
      },
      setSettingsToggleState: () => {},
      onView: {},
    });

    machine.toggleSettings();
    expect(views.settingsView.classList.contains("hidden")).toBe(false);
    machine.toggleSettings();
    expect(views.listView.classList.contains("hidden")).toBe(false);
  });
});
