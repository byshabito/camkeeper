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

import { normalizePrivateKeyHex } from "./crypto.js";
import { bytesToBase64Url, hexToBytes, utf8ToBytes } from "./encoding.js";
import { hkdfSha256, hmacSha256 } from "./kdf.js";

const ADDRESS_KDF_SALT = utf8ToBytes("camkeeper/nostr-sync/v1/address");
const ADDRESS_KDF_INFO = utf8ToBytes("camkeeper/address-key");
const PROFILE_D_MESSAGE_PREFIX = "profile:";
const SETTINGS_D_MESSAGE_PREFIX = "settings:";

async function deriveAddressKey(privateKeyHex) {
  const normalizedPrivateKeyHex = normalizePrivateKeyHex(privateKeyHex);
  return hkdfSha256({
    ikm: hexToBytes(normalizedPrivateKeyHex),
    salt: ADDRESS_KDF_SALT,
    info: ADDRESS_KDF_INFO,
    length: 32,
  });
}

function normalizeEntityId(value, label) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return normalized;
}

async function deriveOpaqueDTagFromMessage(privateKeyHex, message) {
  const addressKey = await deriveAddressKey(privateKeyHex);
  const digest = await hmacSha256(addressKey, utf8ToBytes(message));
  return bytesToBase64Url(digest);
}

export async function deriveProfileDTag(privateKeyHex, profileId) {
  const normalizedProfileId = normalizeEntityId(profileId, "Profile id");
  return deriveOpaqueDTagFromMessage(privateKeyHex, `${PROFILE_D_MESSAGE_PREFIX}${normalizedProfileId}`);
}

export async function deriveSettingsDTag(privateKeyHex, scope = "default") {
  const normalizedScope = normalizeEntityId(scope, "Settings scope");
  return deriveOpaqueDTagFromMessage(privateKeyHex, `${SETTINGS_D_MESSAGE_PREFIX}${normalizedScope}`);
}
