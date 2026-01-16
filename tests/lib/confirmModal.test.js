import { describe, expect, test } from "bun:test";

import { initConfirmModal } from "../../src/lib/confirmModal.js";

function createElement() {
  return {
    textContent: "",
    innerHTML: "",
    classList: {
      _classes: new Set(["hidden"]),
      add(name) {
        this._classes.add(name);
      },
      remove(name) {
        this._classes.delete(name);
      },
      contains(name) {
        return this._classes.has(name);
      },
    },
    appendChild(child) {
      this._children = this._children || [];
      this._children.push(child);
    },
    onclick: null,
  };
}

describe("confirmModal", () => {
  test("returns fallback when elements missing", async () => {
    globalThis.document = { getElementById: () => null };
    const confirm = initConfirmModal();
    const result = await confirm({});
    expect(result).toBe(false);
  });

  test("resolves when confirm clicked", async () => {
    const modal = createElement();
    const title = createElement();
    const message = createElement();
    const list = createElement();
    const cancel = createElement();
    const accept = createElement();

    const elements = {
      "confirm-modal": modal,
      "confirm-title": title,
      "confirm-message": message,
      "confirm-list": list,
      "confirm-cancel": cancel,
      "confirm-accept": accept,
    };

    globalThis.document = {
      getElementById: (id) => elements[id] || null,
      createElement: () => createElement(),
    };

    const confirm = initConfirmModal();
    const promise = confirm({
      titleText: "Delete",
      messageText: "Confirm",
      items: ["One", "Two"],
      confirmLabel: "Remove",
    });

    expect(title.textContent).toBe("Delete");
    expect(message.textContent).toBe("Confirm");
    expect(accept.textContent).toBe("Remove");
    expect(modal.classList.contains("hidden")).toBe(false);

    accept.onclick();
    const result = await promise;
    expect(result).toBe(true);
    expect(modal.classList.contains("hidden")).toBe(true);
  });
});
