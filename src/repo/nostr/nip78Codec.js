/*
 * CamKeeper - Cross-site creator profile manager
 * Copyright (C) 2026  Shabito
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { deriveProfileDTag, deriveSettingsDTag } from "./addresses.js";
import { decryptPayloadEnvelope, encryptPayloadEnvelope } from "./payloadCodec.js";

export const NIP78_EVENT_KIND = 30078;
export const NIP78_SCHEMA_VERSION = 1;
export const NIP78_APP_ID = "camkeeper";
export const NIP78_ENTITY_PROFILE = "profile";
export const NIP78_ENTITY_SETTINGS = "settings";
export const NIP78_ACTION_UPSERT = "upsert";
export const NIP78_ACTION_DELETE = "delete";

function normalizeTimestampMs(value, fallback = Date.now()) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : Math.max(0, Math.floor(fallback));
}

function normalizeProfileId(profileId) {
  const normalized = typeof profileId === "string" ? profileId.trim() : "";
  if (!normalized) {
    throw new Error("Profile id must be a non-empty string.");
  }
  return normalized;
}

function normalizeSettingsScope(scope) {
  const normalized = typeof scope === "string" ? scope.trim() : "";
  return normalized || "default";
}

function normalizeEventTags(tags) {
  return Array.isArray(tags)
    ? tags.filter((tag) => Array.isArray(tag) && tag.length > 0).map((tag) => tag.map((value) => String(value)))
    : [];
}

function findDTag(tags) {
  const normalizedTags = normalizeEventTags(tags);
  const tag = normalizedTags.find((item) => item[0] === "d" && typeof item[1] === "string");
  return tag ? String(tag[1]) : "";
}

function normalizeEnvelope(rawEnvelope) {
  const source = rawEnvelope && typeof rawEnvelope === "object" ? rawEnvelope : {};
  return {
    schemaVersion: Number.isFinite(source.schemaVersion)
      ? Math.floor(source.schemaVersion)
      : Number.isFinite(source.v)
        ? Math.floor(source.v)
        : 0,
    app: typeof source.app === "string" ? source.app : "",
    entity: typeof source.entity === "string" ? source.entity : "",
    action: typeof source.action === "string" ? source.action : "",
    profileId: typeof source.profileId === "string" ? source.profileId : "",
    scope: typeof source.scope === "string" ? source.scope : "",
    updatedAt: Number.isFinite(source.updatedAt) ? Math.floor(source.updatedAt) : null,
    deletedAt: Number.isFinite(source.deletedAt) ? Math.floor(source.deletedAt) : null,
    payload: source.payload,
  };
}

function assertEnvelopeBase(envelope) {
  if (envelope.schemaVersion !== NIP78_SCHEMA_VERSION) {
    throw new Error("Unsupported NIP-78 payload schema version.");
  }
  if (envelope.app !== NIP78_APP_ID) {
    throw new Error("Unsupported NIP-78 payload app identifier.");
  }
}

function assertProfileEnvelope(envelope) {
  assertEnvelopeBase(envelope);
  if (envelope.entity !== NIP78_ENTITY_PROFILE) {
    throw new Error("NIP-78 payload entity is not profile.");
  }
  const profileId = normalizeProfileId(envelope.profileId);
  if (envelope.action === NIP78_ACTION_UPSERT) {
    return {
      ...envelope,
      profileId,
      updatedAt: normalizeTimestampMs(envelope.updatedAt),
    };
  }
  if (envelope.action === NIP78_ACTION_DELETE) {
    return {
      ...envelope,
      profileId,
      deletedAt: normalizeTimestampMs(envelope.deletedAt),
    };
  }
  throw new Error("NIP-78 payload action is invalid for profile.");
}

function assertSettingsEnvelope(envelope) {
  assertEnvelopeBase(envelope);
  if (envelope.entity !== NIP78_ENTITY_SETTINGS) {
    throw new Error("NIP-78 payload entity is not settings.");
  }
  if (envelope.action !== NIP78_ACTION_UPSERT) {
    throw new Error("NIP-78 settings payload must be upsert.");
  }
  return {
    ...envelope,
    scope: normalizeSettingsScope(envelope.scope),
    updatedAt: normalizeTimestampMs(envelope.updatedAt),
  };
}

export function buildProfileUpsertEnvelope(profile, { updatedAt = Date.now() } = {}) {
  const profileId = normalizeProfileId(profile?.id);
  return {
    schemaVersion: NIP78_SCHEMA_VERSION,
    app: NIP78_APP_ID,
    entity: NIP78_ENTITY_PROFILE,
    action: NIP78_ACTION_UPSERT,
    profileId,
    updatedAt: normalizeTimestampMs(updatedAt),
    payload: profile,
  };
}

export function buildProfileDeleteEnvelope({ profileId, deletedAt = Date.now() }) {
  return {
    schemaVersion: NIP78_SCHEMA_VERSION,
    app: NIP78_APP_ID,
    entity: NIP78_ENTITY_PROFILE,
    action: NIP78_ACTION_DELETE,
    profileId: normalizeProfileId(profileId),
    deletedAt: normalizeTimestampMs(deletedAt),
    payload: null,
  };
}

export function buildSettingsUpsertEnvelope(settingsPayload, { scope = "default", updatedAt = Date.now() } = {}) {
  return {
    schemaVersion: NIP78_SCHEMA_VERSION,
    app: NIP78_APP_ID,
    entity: NIP78_ENTITY_SETTINGS,
    action: NIP78_ACTION_UPSERT,
    scope: normalizeSettingsScope(scope),
    updatedAt: normalizeTimestampMs(updatedAt),
    payload: settingsPayload,
  };
}

export async function encodeProfileEnvelopeContent(privateKeyHex, envelope) {
  const profileEnvelope = assertProfileEnvelope(normalizeEnvelope(envelope));
  return encryptPayloadEnvelope(privateKeyHex, profileEnvelope);
}

export async function decodeProfileEnvelopeContent(privateKeyHex, encodedContent) {
  const decrypted = await decryptPayloadEnvelope(privateKeyHex, encodedContent);
  return assertProfileEnvelope(normalizeEnvelope(decrypted));
}

export async function encodeSettingsEnvelopeContent(privateKeyHex, envelope) {
  const settingsEnvelope = assertSettingsEnvelope(normalizeEnvelope(envelope));
  return encryptPayloadEnvelope(privateKeyHex, settingsEnvelope);
}

export async function decodeSettingsEnvelopeContent(privateKeyHex, encodedContent) {
  const decrypted = await decryptPayloadEnvelope(privateKeyHex, encodedContent);
  return assertSettingsEnvelope(normalizeEnvelope(decrypted));
}

export async function buildProfileUpsertEventTemplate(privateKeyHex, profile, options = {}) {
  const envelope = buildProfileUpsertEnvelope(profile, options);
  const dTag = await deriveProfileDTag(privateKeyHex, envelope.profileId);
  const content = await encodeProfileEnvelopeContent(privateKeyHex, envelope);
  return {
    kind: NIP78_EVENT_KIND,
    tags: [["d", dTag]],
    content,
  };
}

export async function buildProfileDeleteEventTemplate(privateKeyHex, options) {
  const envelope = buildProfileDeleteEnvelope(options || {});
  const dTag = await deriveProfileDTag(privateKeyHex, envelope.profileId);
  const content = await encodeProfileEnvelopeContent(privateKeyHex, envelope);
  return {
    kind: NIP78_EVENT_KIND,
    tags: [["d", dTag]],
    content,
  };
}

export async function buildSettingsUpsertEventTemplate(privateKeyHex, settingsPayload, options = {}) {
  const envelope = buildSettingsUpsertEnvelope(settingsPayload, options);
  const dTag = await deriveSettingsDTag(privateKeyHex, envelope.scope);
  const content = await encodeSettingsEnvelopeContent(privateKeyHex, envelope);
  return {
    kind: NIP78_EVENT_KIND,
    tags: [["d", dTag]],
    content,
  };
}

export async function decodeProfileEventContent(privateKeyHex, event) {
  if (!event || typeof event !== "object") {
    throw new Error("NIP-78 event is missing.");
  }
  if (Number(event.kind) !== NIP78_EVENT_KIND) {
    throw new Error("NIP-78 event kind is invalid.");
  }
  const dTag = findDTag(event.tags);
  if (!dTag) {
    throw new Error("NIP-78 event is missing the d tag.");
  }
  const envelope = await decodeProfileEnvelopeContent(privateKeyHex, event.content);
  const expectedDTag = await deriveProfileDTag(privateKeyHex, envelope.profileId);
  if (expectedDTag !== dTag) {
    throw new Error("NIP-78 event d tag does not match envelope profile id.");
  }
  return envelope;
}

export async function decodeSettingsEventContent(privateKeyHex, event) {
  if (!event || typeof event !== "object") {
    throw new Error("NIP-78 event is missing.");
  }
  if (Number(event.kind) !== NIP78_EVENT_KIND) {
    throw new Error("NIP-78 event kind is invalid.");
  }
  const dTag = findDTag(event.tags);
  if (!dTag) {
    throw new Error("NIP-78 event is missing the d tag.");
  }
  const envelope = await decodeSettingsEnvelopeContent(privateKeyHex, event.content);
  const expectedDTag = await deriveSettingsDTag(privateKeyHex, envelope.scope);
  if (expectedDTag !== dTag) {
    throw new Error("NIP-78 event d tag does not match settings scope.");
  }
  return envelope;
}
