import test from "node:test";
import assert from "node:assert/strict";

import {
  ensureNostrChangeTrackingBootstrap,
  trackLocalProfilePersistence,
} from "../../src/domain/services/nostrSyncMutationStore.js";
import {
  NOSTR_SYNC_CHANGE_TRACKING_VERSION_STATE_KEY,
  NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY,
  NOSTR_SYNC_PROFILE_SHADOW_STATE_KEY,
} from "../../src/domain/stateKeys.js";

function createProfile(overrides = {}) {
  return {
    id: "alpha",
    name: "Alpha",
    cams: [],
    socials: [],
    tags: [],
    folder: "",
    notes: "",
    pinned: false,
    createdAt: 100,
    updatedAt: 100,
    ...overrides,
  };
}

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

test("trackLocalProfilePersistence marks view-time-only changes as pending upsert", async () => {
  const { state, getStateFn, setStateFn } = createStateAccess({
    [NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY]: {},
    [NOSTR_SYNC_PROFILE_SHADOW_STATE_KEY]: {},
  });

  await trackLocalProfilePersistence({
    previousProfiles: [createProfile({
      cams: [{ site: "chaturbate.com", username: "alpha", viewMs: 0, viewHistory: [] }],
    })],
    nextProfiles: [createProfile({
      cams: [{ site: "chaturbate.com", username: "alpha", viewMs: 1200, viewHistory: [] }],
    })],
    getStateFn,
    setStateFn,
    now: () => 500,
  });

  assert.deepEqual(state[NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY], {
    alpha: { state: "upsert", timestamp: 500 },
  });
});

test("trackLocalProfilePersistence clears create-then-delete before sync", async () => {
  const { state, getStateFn, setStateFn } = createStateAccess({
    [NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY]: {
      alpha: { state: "upsert", timestamp: 400 },
    },
    [NOSTR_SYNC_PROFILE_SHADOW_STATE_KEY]: {},
  });

  await trackLocalProfilePersistence({
    previousProfiles: [createProfile()],
    nextProfiles: [],
    getStateFn,
    setStateFn,
    now: () => 500,
  });

  assert.deepEqual(state[NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY], {});
});

test("trackLocalProfilePersistence marks delete when the profile was previously synced", async () => {
  const { state, getStateFn, setStateFn } = createStateAccess({
    [NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY]: {},
    [NOSTR_SYNC_PROFILE_SHADOW_STATE_KEY]: {
      alpha: { state: "upsert", timestamp: 200 },
    },
  });

  await trackLocalProfilePersistence({
    previousProfiles: [createProfile()],
    nextProfiles: [],
    getStateFn,
    setStateFn,
    now: () => 500,
  });

  assert.deepEqual(state[NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY], {
    alpha: { state: "delete", timestamp: 500 },
  });
});

test("ensureNostrChangeTrackingBootstrap seeds current profiles once and then becomes idempotent", async () => {
  const { state, getStateFn, setStateFn } = createStateAccess({
    [NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY]: {
      alpha: { state: "upsert", timestamp: 900 },
    },
  });

  const first = await ensureNostrChangeTrackingBootstrap({
    getProfilesFn: async () => [
      createProfile(),
      createProfile({ id: "beta", name: "Beta" }),
    ],
    getStateFn,
    setStateFn,
    now: () => 500,
  });

  assert.deepEqual(first, {
    alpha: { state: "upsert", timestamp: 900 },
    beta: { state: "upsert", timestamp: 500 },
  });
  assert.equal(state[NOSTR_SYNC_CHANGE_TRACKING_VERSION_STATE_KEY], 1);

  const second = await ensureNostrChangeTrackingBootstrap({
    getProfilesFn: async () => [createProfile({ id: "gamma", name: "Gamma" })],
    getStateFn,
    setStateFn,
    now: () => 1200,
  });

  assert.deepEqual(second, {
    alpha: { state: "upsert", timestamp: 900 },
    beta: { state: "upsert", timestamp: 500 },
  });
});
