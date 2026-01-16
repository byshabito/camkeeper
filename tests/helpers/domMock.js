export function createClassList(initial = []) {
  const classes = new Set(initial);
  return {
    add: (name) => classes.add(name),
    remove: (name) => classes.delete(name),
    toggle: (name, force) => {
      const enabled = force ?? !classes.has(name);
      if (enabled) classes.add(name);
      else classes.delete(name);
    },
    contains: (name) => classes.has(name),
    toString: () => Array.from(classes).join(" "),
  };
}

export function createMockElement(tagName = "div") {
  const element = {
    tagName: tagName.toUpperCase(),
    children: [],
    parentNode: null,
    classList: createClassList(),
    style: {
      setProperty: () => {},
    },
    dataset: {},
    attributes: {},
    textContent: "",
    innerHTML: "",
    value: "",
    type: "",
    href: "",
    target: "",
    rel: "",
    title: "",
    disabled: false,
    placeholder: "",
    draggable: false,
    onclick: null,
    _listeners: new Map(),
    appendChild(child) {
      child.parentNode = element;
      element.children.push(child);
      return child;
    },
    removeChild(child) {
      element.children = element.children.filter((item) => item !== child);
      child.parentNode = null;
    },
    get firstChild() {
      return element.children[0] || null;
    },
    remove() {
      if (element.parentNode) element.parentNode.removeChild(element);
    },
    setAttribute(key, value) {
      element.attributes[key] = String(value);
      if (key.startsWith("data-")) {
        element.dataset[key.replace("data-", "")] = String(value);
      }
    },
    getAttribute(key) {
      return element.attributes[key];
    },
    addEventListener(event, handler) {
      if (!element._listeners.has(event)) {
        element._listeners.set(event, []);
      }
      element._listeners.get(event).push(handler);
    },
    dispatchEvent(event) {
      const handlers = element._listeners.get(event.type) || [];
      handlers.forEach((handler) => handler(event));
      if (event.type === "click" && typeof element.onclick === "function") {
        element.onclick(event);
      }
    },
    querySelector(selector) {
      return querySelector(element, selector, true);
    },
    querySelectorAll(selector) {
      return querySelector(element, selector, false) || [];
    },
    focus() {
      element._focused = true;
    },
    blur() {
      element.dispatchEvent({ type: "blur", target: element });
    },
  };
  return element;
}

export function createDocumentMock(elements = {}) {
  const document = {
    body: createMockElement("body"),
    activeElement: null,
    readyState: "complete",
    _elements: elements,
    createElement: (tagName) => createMockElement(tagName),
    getElementById: (id) => elements[id] || null,
    querySelector: (selector) => {
      if (selector === ".search-sort") return elements.searchSort || null;
      return null;
    },
    addEventListener: () => {},
    importNode: (node) => ({ ...node }),
  };
  return document;
}

export function installDomMock(elements = {}) {
  const previousDocument = globalThis.document;
  const previousDOMParser = globalThis.DOMParser;
  const document = createDocumentMock(elements);

  globalThis.document = document;
  globalThis.DOMParser = class DOMParserMock {
    parseFromString(text) {
      return { documentElement: { nodeName: "svg", textContent: text } };
    }
  };

  return {
    document,
    restore() {
      globalThis.document = previousDocument;
      globalThis.DOMParser = previousDOMParser;
    },
  };
}

function querySelector(root, selector, firstOnly) {
  const matches = [];
  const match = (node) => {
    if (!node) return false;
    if (selector.startsWith(".")) {
      const classes = selector.slice(1).split(".");
      return classes.every((name) => node.classList?.contains(name));
    }
    if (selector.startsWith("[")) {
      const matchData = selector.match(/\[data-([^=]+)="([^"]+)"\]/);
      if (matchData) {
        const key = `data-${matchData[1]}`;
        return node.attributes?.[key] === matchData[2];
      }
    }
    return node.tagName?.toLowerCase() === selector.toLowerCase();
  };

  const walk = (node) => {
    const childNodes = Array.isArray(node.children) ? node.children : [];
    childNodes.forEach((child) => {
      if (match(child)) {
        matches.push(child);
        if (firstOnly) return;
      }
      walk(child);
    });
  };

  walk(root);
  return firstOnly ? matches[0] || null : matches;
}
