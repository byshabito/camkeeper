import test from "node:test";
import assert from "node:assert/strict";

import { deriveSettingsDTag } from "../../src/repo/nostr/addresses.js";
import {
  buildSettingsUpsertEventTemplate,
  decodeSettingsEventContent,
} from "../../src/repo/nostr/nip78Codec.js";

const PRIVATE_KEY_HEX = "1".repeat(64);

test("deriveSettingsDTag is scope-aware", async () => {
  const defaultTag = await deriveSettingsDTag(PRIVATE_KEY_HEX);
  const livestreamTag = await deriveSettingsDTag(PRIVATE_KEY_HEX, "livestream_sites");
  const otherTag = await deriveSettingsDTag(PRIVATE_KEY_HEX, "other_scope");

  assert.notEqual(defaultTag, livestreamTag);
  assert.notEqual(livestreamTag, otherTag);
});

test("settings event template round-trips with the livestream_sites scope", async () => {
  const template = await buildSettingsUpsertEventTemplate(
    PRIVATE_KEY_HEX,
    [{ host: "kick.com", label: "Kick", abbr: "KI", color: "#53fc18" }],
    { scope: "livestream_sites", updatedAt: 1234 },
  );

  const decoded = await decodeSettingsEventContent(PRIVATE_KEY_HEX, {
    kind: 30078,
    tags: template.tags,
    content: template.content,
  });

  assert.equal(decoded.entity, "settings");
  assert.equal(decoded.scope, "livestream_sites");
  assert.equal(decoded.updatedAt, 1234);
  assert.deepEqual(decoded.payload, [
    { host: "kick.com", label: "Kick", abbr: "KI", color: "#53fc18" },
  ]);
});
