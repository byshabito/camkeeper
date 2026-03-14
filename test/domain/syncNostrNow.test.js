import test from "node:test";
import assert from "node:assert/strict";

import {
  NOSTR_SYNC_CHANGE_TRACKING_VERSION_STATE_KEY,
  NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY,
  NOSTR_SYNC_PROFILE_SHADOW_STATE_KEY,
  NOSTR_SYNC_PROFILE_TOMBSTONES_STATE_KEY,
  NOSTR_SYNC_SETTINGS_CHANGE_TRACKING_VERSION_STATE_KEY,
  NOSTR_SYNC_SETTINGS_LOCAL_MUTATIONS_STATE_KEY,
  NOSTR_SYNC_SETTINGS_SHADOW_STATE_KEY,
} from "../../src/domain/stateKeys.js";
import { NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES } from "../../src/domain/services/nostrSyncSettingsMutationStore.js";

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

function createSettings(overrides = {}) {
  return {
    viewMetric: "focus",
    lastSort: "month",
    lastFolderFilter: "",
    lastFolderOrder: [],
    livestreamSites: [{ host: "twitch.tv" }, { host: "youtube.com" }],
    nostrSync: {
      enabled: false,
      signerType: "local_nsec",
      relays: [],
      relaysCustomized: false,
      autoPush: false,
    },
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
  localSettings = createSettings(),
  remoteEvents = [],
  publishAcceptedCount = 1,
  saveProfilesImpl,
  saveSettingsImpl,
  setStatusImpl,
}) {
  const published = [];
  const savedProfilesCalls = [];
  const savedSettingsCalls = [];
  const { getStateFn, setStateFn } = createStateAccess(state);

  return {
    published,
    savedProfilesCalls,
    savedSettingsCalls,
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
        getSettingsFn: async () => localSettings,
        saveSettingsFn: async (settings, options) => {
          savedSettingsCalls.push({ settings, options });
          if (typeof saveSettingsImpl === "function") {
            return saveSettingsImpl(settings, options);
          }
          return settings;
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
        decodeSettingsEventContentFn: async (_privateKeyHex, event) => event.__decoded,
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
        buildSettingsUpsertEventTemplateFn: async (_privateKeyHex, payload, options) => ({
          kind: 1,
          content: "settings-upsert",
          tags: [],
          payload,
          options,
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

function createRemoteSettingsEvent({
  scope = NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES,
  updatedAt,
  payload = [{ host: "kick.com", label: "Kick", abbr: "KI", color: "#53fc18" }],
}) {
  return {
    id: `settings-${scope}-${updatedAt}`,
    content: "encoded-settings",
    created_at: Math.floor(updatedAt / 1000),
    __decoded: {
      entity: "settings",
      action: "upsert",
      scope,
      payload,
      updatedAt,
    },
  };
}

test("syncNostrNow pushes profiles with pending local upserts even when updatedAt is older than shadow", async () => {
  const initialState = {
    [NOSTR_SYNC_CHANGE_TRACKING_VERSION_STATE_KEY]: 1,
    [NOSTR_SYNC_SETTINGS_CHANGE_TRACKING_VERSION_STATE_KEY]: 1,
    [NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY]: {
      alpha: { state: "upsert", timestamp: 500 },
    },
    [NOSTR_SYNC_PROFILE_SHADOW_STATE_KEY]: {
      alpha: { state: "upsert", timestamp: 200 },
    },
    [NOSTR_SYNC_PROFILE_TOMBSTONES_STATE_KEY]: {},
    [NOSTR_SYNC_SETTINGS_LOCAL_MUTATIONS_STATE_KEY]: {},
    [NOSTR_SYNC_SETTINGS_SHADOW_STATE_KEY]: {},
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
    [NOSTR_SYNC_SETTINGS_CHANGE_TRACKING_VERSION_STATE_KEY]: 1,
    [NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY]: {},
    [NOSTR_SYNC_PROFILE_SHADOW_STATE_KEY]: {
      alpha: { state: "upsert", timestamp: 500 },
    },
    [NOSTR_SYNC_PROFILE_TOMBSTONES_STATE_KEY]: {},
    [NOSTR_SYNC_SETTINGS_LOCAL_MUTATIONS_STATE_KEY]: {},
    [NOSTR_SYNC_SETTINGS_SHADOW_STATE_KEY]: {},
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
    [NOSTR_SYNC_SETTINGS_CHANGE_TRACKING_VERSION_STATE_KEY]: 1,
    [NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY]: {
      alpha: { state: "upsert", timestamp: 500 },
    },
    [NOSTR_SYNC_PROFILE_SHADOW_STATE_KEY]: {},
    [NOSTR_SYNC_PROFILE_TOMBSTONES_STATE_KEY]: {},
    [NOSTR_SYNC_SETTINGS_LOCAL_MUTATIONS_STATE_KEY]: {},
    [NOSTR_SYNC_SETTINGS_SHADOW_STATE_KEY]: {},
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
    [NOSTR_SYNC_SETTINGS_CHANGE_TRACKING_VERSION_STATE_KEY]: 1,
    [NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY]: {
      alpha: { state: "upsert", timestamp: 200 },
    },
    [NOSTR_SYNC_PROFILE_SHADOW_STATE_KEY]: {},
    [NOSTR_SYNC_PROFILE_TOMBSTONES_STATE_KEY]: {},
    [NOSTR_SYNC_SETTINGS_LOCAL_MUTATIONS_STATE_KEY]: {},
    [NOSTR_SYNC_SETTINGS_SHADOW_STATE_KEY]: {},
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
    [NOSTR_SYNC_SETTINGS_CHANGE_TRACKING_VERSION_STATE_KEY]: 1,
    [NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY]: {},
    [NOSTR_SYNC_PROFILE_SHADOW_STATE_KEY]: {},
    [NOSTR_SYNC_PROFILE_TOMBSTONES_STATE_KEY]: {},
    [NOSTR_SYNC_SETTINGS_LOCAL_MUTATIONS_STATE_KEY]: {},
    [NOSTR_SYNC_SETTINGS_SHADOW_STATE_KEY]: {},
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
    [NOSTR_SYNC_SETTINGS_CHANGE_TRACKING_VERSION_STATE_KEY]: 1,
    [NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY]: {
      alpha: { state: "delete", timestamp: 600 },
    },
    [NOSTR_SYNC_PROFILE_SHADOW_STATE_KEY]: {
      alpha: { state: "upsert", timestamp: 500 },
    },
    [NOSTR_SYNC_PROFILE_TOMBSTONES_STATE_KEY]: {},
    [NOSTR_SYNC_SETTINGS_LOCAL_MUTATIONS_STATE_KEY]: {},
    [NOSTR_SYNC_SETTINGS_SHADOW_STATE_KEY]: {},
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

test("syncNostrNow pushes livestream site settings from the pending local settings mutation ledger", async () => {
  const initialState = {
    [NOSTR_SYNC_CHANGE_TRACKING_VERSION_STATE_KEY]: 1,
    [NOSTR_SYNC_SETTINGS_CHANGE_TRACKING_VERSION_STATE_KEY]: 1,
    [NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY]: {},
    [NOSTR_SYNC_PROFILE_SHADOW_STATE_KEY]: {},
    [NOSTR_SYNC_PROFILE_TOMBSTONES_STATE_KEY]: {},
    [NOSTR_SYNC_SETTINGS_LOCAL_MUTATIONS_STATE_KEY]: {
      [NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES]: { timestamp: 700 },
    },
    [NOSTR_SYNC_SETTINGS_SHADOW_STATE_KEY]: {},
  };
  const deps = createSyncDependencies({
    state: initialState,
    localProfiles: [],
    localSettings: createSettings({
      livestreamSites: [{ host: "kick.com", label: "Kick", abbr: "KI", color: "#53fc18" }],
    }),
  });

  const result = await deps.run();

  assert.equal(result.ok, true);
  assert.equal(result.pushedCount, 1);
  assert.deepEqual(result.pushedSettingsScopes, [NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES]);
  assert.deepEqual(initialState[NOSTR_SYNC_SETTINGS_LOCAL_MUTATIONS_STATE_KEY], {});
  assert.deepEqual(initialState[NOSTR_SYNC_SETTINGS_SHADOW_STATE_KEY], {
    [NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES]: { timestamp: 700 },
  });
});

test("syncNostrNow pulls newer livestream site settings and saves them with syncOrigin remote", async () => {
  const initialState = {
    [NOSTR_SYNC_CHANGE_TRACKING_VERSION_STATE_KEY]: 1,
    [NOSTR_SYNC_SETTINGS_CHANGE_TRACKING_VERSION_STATE_KEY]: 1,
    [NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY]: {},
    [NOSTR_SYNC_PROFILE_SHADOW_STATE_KEY]: {},
    [NOSTR_SYNC_PROFILE_TOMBSTONES_STATE_KEY]: {},
    [NOSTR_SYNC_SETTINGS_LOCAL_MUTATIONS_STATE_KEY]: {
      [NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES]: { timestamp: 200 },
    },
    [NOSTR_SYNC_SETTINGS_SHADOW_STATE_KEY]: {},
  };
  const deps = createSyncDependencies({
    state: initialState,
    localProfiles: [],
    localSettings: createSettings({
      livestreamSites: [{ host: "twitch.tv" }],
    }),
    remoteEvents: [createRemoteSettingsEvent({
      updatedAt: 600,
      payload: [{ host: "kick.com", label: "Kick", abbr: "KI", color: "#53fc18" }],
    })],
  });

  const result = await deps.run({ mode: "pull" });

  assert.equal(result.pulledCount, 1);
  assert.deepEqual(result.pulledSettingsScopes, [NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES]);
  assert.equal(deps.savedSettingsCalls.length, 1);
  assert.deepEqual(deps.savedSettingsCalls[0].options, { syncOrigin: "remote" });
  assert.deepEqual(initialState[NOSTR_SYNC_SETTINGS_LOCAL_MUTATIONS_STATE_KEY], {});
  assert.deepEqual(initialState[NOSTR_SYNC_SETTINGS_SHADOW_STATE_KEY], {
    [NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES]: { timestamp: 600 },
  });
});

test("syncNostrNow keeps newer local livestream site edits when pulling older remote settings", async () => {
  const initialState = {
    [NOSTR_SYNC_CHANGE_TRACKING_VERSION_STATE_KEY]: 1,
    [NOSTR_SYNC_SETTINGS_CHANGE_TRACKING_VERSION_STATE_KEY]: 1,
    [NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY]: {},
    [NOSTR_SYNC_PROFILE_SHADOW_STATE_KEY]: {},
    [NOSTR_SYNC_PROFILE_TOMBSTONES_STATE_KEY]: {},
    [NOSTR_SYNC_SETTINGS_LOCAL_MUTATIONS_STATE_KEY]: {
      [NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES]: { timestamp: 900 },
    },
    [NOSTR_SYNC_SETTINGS_SHADOW_STATE_KEY]: {},
  };
  const deps = createSyncDependencies({
    state: initialState,
    localProfiles: [],
    localSettings: createSettings({
      livestreamSites: [{ host: "stripchat.com", label: "Stripchat" }],
    }),
    remoteEvents: [createRemoteSettingsEvent({
      updatedAt: 600,
      payload: [{ host: "kick.com", label: "Kick", abbr: "KI", color: "#53fc18" }],
    })],
  });

  const result = await deps.run({ mode: "pull" });

  assert.equal(result.pulledCount, 0);
  assert.equal(deps.savedSettingsCalls.length, 0);
  assert.deepEqual(initialState[NOSTR_SYNC_SETTINGS_LOCAL_MUTATIONS_STATE_KEY], {
    [NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES]: { timestamp: 900 },
  });
});

test("syncNostrNow bootstraps current livestream sites for one-time republish", async () => {
  const initialState = {
    [NOSTR_SYNC_CHANGE_TRACKING_VERSION_STATE_KEY]: 1,
    [NOSTR_SYNC_PROFILE_LOCAL_MUTATIONS_STATE_KEY]: {},
    [NOSTR_SYNC_PROFILE_SHADOW_STATE_KEY]: {},
    [NOSTR_SYNC_PROFILE_TOMBSTONES_STATE_KEY]: {},
    [NOSTR_SYNC_SETTINGS_LOCAL_MUTATIONS_STATE_KEY]: {},
    [NOSTR_SYNC_SETTINGS_SHADOW_STATE_KEY]: {},
  };
  const deps = createSyncDependencies({
    state: initialState,
    localProfiles: [],
    localSettings: createSettings({
      livestreamSites: [{ host: "kick.com", label: "Kick", abbr: "KI", color: "#53fc18" }],
    }),
  });

  const result = await deps.run();

  assert.equal(result.pushedCount, 1);
  assert.equal(initialState[NOSTR_SYNC_SETTINGS_CHANGE_TRACKING_VERSION_STATE_KEY], 1);
  assert.deepEqual(result.pushedSettingsScopes, [NOSTR_SYNC_SETTINGS_SCOPE_LIVESTREAM_SITES]);
  assert.deepEqual(initialState[NOSTR_SYNC_SETTINGS_LOCAL_MUTATIONS_STATE_KEY], {});
});
