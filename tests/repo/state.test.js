import { beforeEach, describe, expect, test } from "bun:test";

import { getSharedChromeMock } from "../helpers/chromeMock.js";

const chromeMock = getSharedChromeMock();

const repo = await import("../../src/repo/state.js");

beforeEach(() => {
  chromeMock.storage.local.clear();
  chromeMock.storage.sync.clear();
});

describe("repo/state", () => {
  test("setState and getState roundtrip", async () => {
    await repo.setState("key", { value: 2 });
    const stored = await repo.getState("key");
    expect(stored).toEqual({ value: 2 });
  });
});
