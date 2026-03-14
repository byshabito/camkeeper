import test from "node:test";
import assert from "node:assert/strict";

import {
  NOSTR_SYNC_NPUB_STATE_KEY,
  NOSTR_SYNC_NSEC_STATE_KEY,
} from "../../src/domain/stateKeys.js";
import {
  getPublicKeyNpubFromPrivateKeyHex,
  privateKeyHexToNsec,
} from "../../src/repo/nostr/crypto.js";

const storageState = {};

globalThis.chrome = {
  storage: {
    local: {
      get(keys, callback) {
        if (Array.isArray(keys)) {
          callback(Object.fromEntries(keys.map((key) => [key, storageState[key]])));
          return;
        }
        if (typeof keys === "string") {
          callback({ [keys]: storageState[keys] });
          return;
        }
        callback({ ...storageState });
      },
      set(payload, callback) {
        Object.assign(storageState, payload || {});
        callback?.();
      },
    },
    sync: {
      get(_keys, callback) {
        callback({});
      },
      set(_payload, callback) {
        callback?.();
      },
    },
  },
  runtime: {
    lastError: null,
  },
};

const {
  clearNostrSyncSecret,
  generateNostrSyncSecret,
  getNostrSyncSecret,
  setNostrSyncSecret,
} = await import("../../src/domain/useCases/nostrSyncSettings.js");

const PRIVATE_KEY_HEX = "1".repeat(64);
const EXPECTED_NSEC = privateKeyHexToNsec(PRIVATE_KEY_HEX);
const EXPECTED_NPUB = getPublicKeyNpubFromPrivateKeyHex(PRIVATE_KEY_HEX);

test("setNostrSyncSecret stores the matching npub beside the normalized nsec", async () => {
  await clearNostrSyncSecret();

  const saved = await setNostrSyncSecret(PRIVATE_KEY_HEX);

  assert.equal(saved, true);
  assert.equal(storageState[NOSTR_SYNC_NSEC_STATE_KEY], EXPECTED_NSEC);
  assert.equal(storageState[NOSTR_SYNC_NPUB_STATE_KEY], EXPECTED_NPUB);
});

test("getNostrSyncSecret backfills the stored npub for older state", async () => {
  await clearNostrSyncSecret();
  storageState[NOSTR_SYNC_NSEC_STATE_KEY] = EXPECTED_NSEC;
  storageState[NOSTR_SYNC_NPUB_STATE_KEY] = "";

  const secret = await getNostrSyncSecret();

  assert.equal(secret, EXPECTED_NSEC);
  assert.equal(storageState[NOSTR_SYNC_NPUB_STATE_KEY], EXPECTED_NPUB);
});

test("clearNostrSyncSecret removes both nsec and npub", async () => {
  await setNostrSyncSecret(PRIVATE_KEY_HEX);

  await clearNostrSyncSecret();

  assert.equal(storageState[NOSTR_SYNC_NSEC_STATE_KEY], "");
  assert.equal(storageState[NOSTR_SYNC_NPUB_STATE_KEY], "");
});

test("generateNostrSyncSecret stores a debug npub alongside the generated nsec", async () => {
  await clearNostrSyncSecret();

  const generated = await generateNostrSyncSecret();

  assert.match(generated, /^nsec1/);
  assert.equal(storageState[NOSTR_SYNC_NSEC_STATE_KEY], generated);
  assert.match(storageState[NOSTR_SYNC_NPUB_STATE_KEY], /^npub1/);
});
