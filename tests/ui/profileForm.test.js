import { describe, expect, test } from "bun:test";

import {
  applyFormViewModel,
  clearFormError,
  createFolderSelectHandlers,
  createFormRow,
  getAttachSelection,
  getFormData,
  renderFolderSelect,
  showFormError,
} from "../../src/lib/ui/components/profileForm.js";
import { buildSites } from "../../src/lib/domain/sites.js";
import { createMockElement, installDomMock } from "../helpers/domMock.js";

const sites = buildSites(["twitch.tv"]);
const siteKeys = Object.keys(sites);
const socialOptions = [{ id: "x", label: "X" }];

describe("profileForm", () => {
  test("showFormError and clearFormError", () => {
    const formError = createMockElement("div");
    showFormError(formError, "Message");
    expect(formError.textContent).toBe("Message");
    clearFormError(formError);
    expect(formError.textContent).toBe("");
  });

  test("createFolderSelectHandlers toggles input", () => {
    const folderSelect = createMockElement("select");
    const folderInput = createMockElement("input");
    const handlers = createFolderSelectHandlers({ folderSelect, folderInput });
    handlers[0].handler();
    folderSelect.value = "__new__";
    handlers[0].handler();
    expect(folderInput.classList.contains("hidden")).toBe(false);
  });

  test("createFormRow parses cam input on blur", () => {
    const { restore } = installDomMock();
    const row = createFormRow({
      type: "cam",
      values: { site: "twitch.tv", username: "Alpha" },
      siteKeys,
      sites,
      socialOptions,
      parseCamInput: (value) => ({ site: "twitch.tv", username: value }),
      parseSocialInput: () => null,
    });
    const input = row.querySelector("input");
    input.value = "Bravo";
    input.blur();
    expect(input.value).toBe("bravo");
    restore();
  });

  test("applyFormViewModel renders rows and attach options", () => {
    const { restore } = installDomMock();
    const elements = {
      nameInput: createMockElement("input"),
      tagsInput: createMockElement("input"),
      folderInput: createMockElement("input"),
      notesInput: createMockElement("textarea"),
      camRows: createMockElement("div"),
      socialRows: createMockElement("div"),
      attachField: createMockElement("div"),
      attachSelect: createMockElement("select"),
    };
    const viewModel = {
      form: {
        name: "Alpha",
        tags: "one",
        folder: "",
        notes: "",
        cams: [{ site: "twitch.tv", username: "alpha" }],
        socials: [{ platform: "x", handle: "alpha" }],
      },
      attachOptions: [{ value: "", label: "Create new profile" }],
    };

    applyFormViewModel({
      viewModel,
      elements,
      createFormRow,
      siteKeys,
      sites,
      socialOptions,
      parseCamInput: () => null,
      parseSocialInput: () => null,
      selectedAttachId: "",
    });

    expect(elements.camRows.children.length).toBe(1);
    expect(elements.attachField.classList.contains("hidden")).toBe(false);
    restore();
  });

  test("renderFolderSelect and getFormData", () => {
    const { restore } = installDomMock();
    const folderSelect = createMockElement("select");
    const folderInput = createMockElement("input");
    renderFolderSelect({
      elements: { folderSelect, folderInput },
      options: [
        { value: "", label: "No folder" },
        { value: "__new__", label: "New folder" },
      ],
      value: "__new__",
      showNewFolderInput: true,
      newFolderValue: "Custom",
    });

    const nameInput = createMockElement("input");
    const tagsInput = createMockElement("input");
    const notesInput = createMockElement("textarea");
    const camRows = createMockElement("div");
    const socialRows = createMockElement("div");

    const row = createMockElement("div");
    row.classList.add("row");
    const select = createMockElement("select");
    select.value = "twitch.tv";
    const input = createMockElement("input");
    input.value = "alpha";
    row.appendChild(select);
    row.appendChild(input);
    camRows.appendChild(row);

    const data = getFormData({
      elements: {
        nameInput,
        tagsInput,
        folderSelect,
        folderInput,
        notesInput,
        camRows,
        socialRows,
      },
    });

    expect(data.folder).toBe("Custom");
    expect(data.cams[0].username).toBe("alpha");
    restore();
  });

  test("getAttachSelection respects hidden field", () => {
    const attachField = createMockElement("div");
    attachField.classList.add("hidden");
    const attachSelect = createMockElement("select");
    attachSelect.value = "one";
    expect(getAttachSelection({ attachField, attachSelect })).toBe(null);
  });
});
