import test from "node:test";
import assert from "node:assert/strict";

import {
  NOSTR_SYNC_CHANGE_TRACKING_VERSION_STATE_KEY,
  NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY,
  NOSTR_SYNC_PROFILE_SHADOW_STATE_KEY,
  NOSTR_SYNC_PROFILE_TOMBSTONES_STATE_KEY,
} from "../../src/domain/stateKeys.js";

if (!globalThis.chrome) {
  globalThis.chrome = {
    storage: {
      local: {
        get(_keys, callback) {
          callback({});
        },
        set(_payload, callback) {
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
}

const { syncNostrNow } = await import("../../src/domain/useCases/syncNostrNow.js");

const VALID_PRIVATE_KEY = "1".repeat(64);

function createProfile(overrides = {}) {
  return {
    id: "alpha",
    name: "Alpha",
    cams: [{ site: "chaturbate.com", username: "alpha", viewMs: 0, viewHistory: [] }],
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

function createSyncDependencies({
  state,
  localProfiles = [],
  remoteEvents = [],
  publishAcceptedCount = 1,
  saveProfilesImpl,
  setStatusImpl,
}) {
  const published = [];
  const savedProfilesCalls = [];
  const { getStateFn, setStateFn } = createStateAccess(state);

  return {
    published,
    savedProfilesCalls,
    run: (input = {}) =>
      syncNostrNow({
        now: () => 1000,
        mode: "push",
        getProfilesFn: async () => localProfiles,
        saveProfilesFn: async (profiles, options) => {
          savedProfilesCalls.push({ profiles, options });
          if (typeof saveProfilesImpl === "function") {
            return saveProfilesImpl(profiles, options);
          }
          return profiles;
        },
        getStateFn,
        setStateFn,
        getNostrSyncConfigFn: async () => ({
          enabled: true,
          relays: ["wss://relay.example"],
        }),
        resolveNostrSyncSecretForSyncFn: async () => VALID_PRIVATE_KEY,
        getNostrSyncStatusFn: async () => ({
          lastAttemptAt: null,
          lastSuccessAt: null,
          lastError: "",
          pushedCount: 0,
          pulledCount: 0,
        }),
        setNostrSyncStatusFn: async (status) => {
          if (typeof setStatusImpl === "function") {
            return setStatusImpl(status);
          }
          return status;
        },
        getPublicKeyHexFn: () => "pubkey",
        queryEventsFn: async () => ({ events: remoteEvents }),
        verifySignedEventFn: async () => true,
        decodeProfileEventContentFn: async (_privateKeyHex, event) => event.__decoded,
        buildProfileUpsertEventTemplateFn: async () => ({
          kind: 1,
          content: "upsert",
          tags: [],
        }),
        buildProfileDeleteEventTemplateFn: async () => ({
          kind: 1,
          content: "delete",
          tags: [],
        }),
        createSignedEventFn: async (event) => ({
          ...event,
          id: `signed-${published.length + 1}`,
        }),
        publishEventFn: async ({ event }) => {
          published.push(event);
          return { acceptedCount: publishAcceptedCount };
        },
        ...input,
      }),
    state,
  };
}

function createRemoteUpsertEvent({ profileId = "alpha", updatedAt, payload = {} }) {
  return {
    id: `event-${profileId}-${updatedAt}`,
    content: "encoded",
    created_at: Math.floor(updatedAt / 1000),
    __decoded: {
      entity: "profile",
      action: "upsert",
      profileId,
      payload: createProfile({ id: profileId, ...payload }),
      updatedAt,
    },
  };
}

test("syncNostrNow pushes profiles with pending local upserts even when updatedAt is older than shadow", async () => {
  const initialState = {
    [NOSTR_SYNC_CHANGE_TRACKING_VERSION_STATE_KEY]: 1,
    [NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY]: {
      alpha: { state: "upsert", timestamp: 500 },
    },
    [NOSTR_SYNC_PROFILE_SHADOW_STATE_KEY]: {
      alpha: { state: "upsert", timestamp: 200 },
    },
    [NOSTR_SYNC_PROFILE_TOMBSTONES_STATE_KEY]: {},
  };
  const deps = createSyncDependencies({
    state: initialState,
    localProfiles: [createProfile({ updatedAt: 100 })],
  });

  const result = await deps.run();

  assert.equal(result.ok, true);
  assert.equal(result.pushedCount, 1);
  assert.equal(deps.published.length, 1);
  assert.deepEqual(initialState[NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY], {});
  assert.deepEqual(initialState[NOSTR_SYNC_PROFILE_SHADOW_STATE_KEY], {
    alpha: { state: "upsert", timestamp: 500 },
  });
});

test("syncNostrNow does not republish unchanged profiles without pending local mutations", async () => {
  const initialState = {
    [NOSTR_SYNC_CHANGE_TRACKING_VERSION_STATE_KEY]: 1,
    [NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY]: {},
    [NOSTR_SYNC_PROFILE_SHADOW_STATE_KEY]: {
      alpha: { state: "upsert", timestamp: 500 },
    },
    [NOSTR_SYNC_PROFILE_TOMBSTONES_STATE_KEY]: {},
  };
  const deps = createSyncDependencies({
    state: initialState,
    localProfiles: [createProfile({ updatedAt: 100 })],
  });

  const result = await deps.run();

  assert.equal(result.ok, true);
  assert.equal(result.pushedCount, 0);
  assert.equal(deps.published.length, 0);
});

test("syncNostrNow keeps locally dirty profiles when a pulled remote upsert is older than the local mutation timestamp", async () => {
  const initialState = {
    [NOSTR_SYNC_CHANGE_TRACKING_VERSION_STATE_KEY]: 1,
    [NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY]: {
      alpha: { state: "upsert", timestamp: 500 },
    },
    [NOSTR_SYNC_PROFILE_SHADOW_STATE_KEY]: {},
    [NOSTR_SYNC_PROFILE_TOMBSTONES_STATE_KEY]: {},
  };
  const deps = createSyncDependencies({
    state: initialState,
    localProfiles: [createProfile({ updatedAt: 100, notes: "local" })],
    remoteEvents: [createRemoteUpsertEvent({
      updatedAt: 400,
      payload: { notes: "remote" },
    })],
  });

  const result = await deps.run({ mode: "pull" });

  assert.equal(result.pulledCount, 0);
  assert.equal(deps.savedProfilesCalls.length, 0);
  assert.deepEqual(initialState[NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY], {
    alpha: { state: "upsert", timestamp: 500 },
  });
});

test("syncNostrNow saves pulled remote winners with syncOrigin remote and clears stale local mutations", async () => {
  const initialState = {
    [NOSTR_SYNC_CHANGE_TRACKING_VERSION_STATE_KEY]: 1,
    [NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY]: {
      alpha: { state: "upsert", timestamp: 200 },
    },
    [NOSTR_SYNC_PROFILE_SHADOW_STATE_KEY]: {},
    [NOSTR_SYNC_PROFILE_TOMBSTONES_STATE_KEY]: {},
  };
  const deps = createSyncDependencies({
    state: initialState,
    localProfiles: [createProfile({ updatedAt: 100, notes: "local" })],
    remoteEvents: [createRemoteUpsertEvent({
      updatedAt: 400,
      payload: { notes: "remote" },
    })],
  });

  const result = await deps.run({ mode: "pull" });

  assert.equal(result.pulledCount, 1);
  assert.equal(deps.savedProfilesCalls.length, 1);
  assert.deepEqual(deps.savedProfilesCalls[0].options, { syncOrigin: "remote" });
  assert.deepEqual(initialState[NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY], {});
});

test("syncNostrNow bootstraps current local profiles for a one-time republish", async () => {
  const initialState = {
    [NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY]: {},
    [NOSTR_SYNC_PROFILE_SHADOW_STATE_KEY]: {},
    [NOSTR_SYNC_PROFILE_TOMBSTONES_STATE_KEY]: {},
  };
  const deps = createSyncDependencies({
    state: initialState,
    localProfiles: [createProfile({ updatedAt: 100 })],
  });

  const result = await deps.run();

  assert.equal(result.pushedCount, 1);
  assert.equal(initialState[NOSTR_SYNC_CHANGE_TRACKING_VERSION_STATE_KEY], 1);
  assert.deepEqual(initialState[NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY], {});
  assert.deepEqual(initialState[NOSTR_SYNC_PROFILE_SHADOW_STATE_KEY], {
    alpha: { state: "upsert", timestamp: 1000 },
  });
});

test("syncNostrNow clears pending deletes after a successful delete publish", async () => {
  const initialState = {
    [NOSTR_SYNC_CHANGE_TRACKING_VERSION_STATE_KEY]: 1,
    [NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY]: {
      alpha: { state: "delete", timestamp: 600 },
    },
    [NOSTR_SYNC_PROFILE_SHADOW_STATE_KEY]: {
      alpha: { state: "upsert", timestamp: 500 },
    },
    [NOSTR_SYNC_PROFILE_TOMBSTONES_STATE_KEY]: {},
  };
  const deps = createSyncDependencies({
    state: initialState,
    localProfiles: [],
  });

  const result = await deps.run();

  assert.equal(result.pushedCount, 1);
  assert.deepEqual(initialState[NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY], {});
  assert.deepEqual(initialState[NOSTR_SYNC_PROFILE_SHADOW_STATE_KEY], {
    alpha: { state: "delete", timestamp: 600 },
  });
  assert.deepEqual(initialState[NOSTR_SYNC_PROFILE_TOMBSTONES_STATE_KEY], {
    alpha: 600,
  });
});
