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

import {
  getPublicKeyHexFromPrivateKeyHex,
  signSchnorr,
  verifySchnorr,
} from "./crypto.js";
import { bytesToHex, hexToBytes, sha256Bytes, utf8ToBytes } from "./encoding.js";

function normalizeContent(content) {
  return typeof content === "string" ? content : "";
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((tag) => Array.isArray(tag) && tag.length > 0)
    .map((tag) => tag.map((value) => String(value)));
}

function normalizeCreatedAt(createdAt) {
  const fallback = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(createdAt)) return fallback;
  return Math.max(0, Math.floor(createdAt));
}

function normalizeKind(kind) {
  if (!Number.isFinite(kind)) {
    throw new Error("Nostr event kind must be a finite number.");
  }
  const normalized = Math.floor(kind);
  if (normalized < 0) {
    throw new Error("Nostr event kind must be non-negative.");
  }
  return normalized;
}

function normalizePubkey(pubkey) {
  const value = typeof pubkey === "string" ? pubkey.trim().toLowerCase() : "";
  if (!/^[0-9a-f]{64}$/.test(value)) {
    throw new Error("Nostr pubkey must be 32-byte lowercase hex.");
  }
  return value;
}

function normalizeEventTemplate({ kind, pubkey, created_at, tags, content }) {
  return {
    kind: normalizeKind(kind),
    pubkey: normalizePubkey(pubkey),
    created_at: normalizeCreatedAt(created_at),
    tags: normalizeTags(tags),
    content: normalizeContent(content),
  };
}

export function serializeEventForId(event) {
  const normalized = normalizeEventTemplate(event);
  return JSON.stringify([
    0,
    normalized.pubkey,
    normalized.created_at,
    normalized.kind,
    normalized.tags,
    normalized.content,
  ]);
}

export async function computeEventIdHex(event) {
  const serialized = serializeEventForId(event);
  const digest = await sha256Bytes(utf8ToBytes(serialized));
  return bytesToHex(digest);
}

export async function createSignedEvent({
  kind,
  tags = [],
  content = "",
  createdAt = Math.floor(Date.now() / 1000),
  privateKeyHex,
}) {
  const pubkey = getPublicKeyHexFromPrivateKeyHex(privateKeyHex);
  const event = normalizeEventTemplate({
    kind,
    pubkey,
    created_at: createdAt,
    tags,
    content,
  });

  const id = await computeEventIdHex(event);
  const sig = await signSchnorr(hexToBytes(id), privateKeyHex);

  return {
    id,
    pubkey,
    created_at: event.created_at,
    kind: event.kind,
    tags: event.tags,
    content: event.content,
    sig,
  };
}

export async function verifySignedEvent(event) {
  if (!event || typeof event !== "object") return false;
  const signature = typeof event.sig === "string" ? event.sig.trim().toLowerCase() : "";
  if (!/^[0-9a-f]{128}$/.test(signature)) return false;

  const expectedId = await computeEventIdHex(event);
  if (expectedId !== String(event.id || "").trim().toLowerCase()) return false;

  return verifySchnorr(signature, hexToBytes(expectedId), event.pubkey);
}
