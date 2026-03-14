import test from "node:test";
import assert from "node:assert/strict";

import {
  ensureNostrSettingsBootstrap,
  markLivestreamSitesChanged,
  NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES,
} from "../../src/domain/services/nostrSyncSettingsMutationStore.js";
import {
  NOSTR_SYNC_SETTINGS_CHANGE_TRACKING_VERSION_STATE_KEY,
  NOSTR_SYNC_SETTINGS_LOCAL_MUTATIONS_STATE_KEY,
} from "../../src/domain/stateKeys.js";

function createStateAccess(initial = {}) {
  const state = initial;
  return {
    state,
    async getStateFn(key) {
      return state[key];
    },
    async setStateFn(key, value) {
      state[key] = value;
      return value;
    },
  };
}

test("markLivestreamSitesChanged records a pending settings mutation only when livestream sites changed", async () => {
  const initialState = {
    [NOSTR_SYNC_SETTINGS_LOCAL_MUTATIONS_STATE_KEY]: {},
  };
  const { state, getStateFn, setStateFn } = createStateAccess(initialState);

  await markLivestreamSitesChanged({
    previousSettings: { viewMetric: "focus", livestreamSites: [{ host: "twitch.tv" }] },
    nextSettings: { viewMetric: "open", livestreamSites: [{ host: "twitch.tv" }] },
    getStateFn,
    setStateFn,
    now: () => 500,
  });

  assert.deepEqual(state[NOSTR_SYNC_SETTINGS_LOCAL_MUTATIONS_STATE_KEY], {});

  await markLivestreamSitesChanged({
    previousSettings: { livestreamSites: [{ host: "twitch.tv" }] },
    nextSettings: { livestreamSites: [{ host: "twitch.tv" }, { host: "kick.com" }] },
    getStateFn,
    setStateFn,
    now: () => 800,
  });

  assert.deepEqual(state[NOSTR_SYNC_SETTINGS_LOCAL_MUTATIONS_STATE_KEY], {
    [NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES]: { timestamp: 800 },
  });
});

test("ensureNostrSettingsBootstrap seeds livestream sites once and preserves newer pending timestamps", async () => {
  const initialState = {
    [NOSTR_SYNC_SETTINGS_LOCAL_MUTATIONS_STATE_KEY]: {
      [NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES]: { timestamp: 900 },
    },
  };
  const { state, getStateFn, setStateFn } = createStateAccess(initialState);

  const first = await ensureNostrSettingsBootstrap({
    getSettingsFn: async () => ({
      livestreamSites: [{ host: "twitch.tv" }, { host: "kick.com" }],
    }),
    getStateFn,
    setStateFn,
    now: () => 500,
  });

  assert.deepEqual(first, {
    [NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES]: { timestamp: 900 },
  });
  assert.equal(state[NOSTR_SYNC_SETTINGS_CHANGE_TRACKING_VERSION_STATE_KEY], 1);

  const second = await ensureNostrSettingsBootstrap({
    getSettingsFn: async () => ({
      livestreamSites: [{ host: "youtube.com" }],
    }),
    getStateFn,
    setStateFn,
    now: () => 1200,
  });

  assert.deepEqual(second, {
    [NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES]: { timestamp: 900 },
  });
});
