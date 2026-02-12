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
import {
  base64UrlToBytes,
  bytesToBase64Url,
  hexToBytes,
  randomBytes,
  utf8ToBytes,
  bytesToUtf8,
} from "./encoding.js";
import { hkdfSha256 } from "./kdf.js";

export const PAYLOAD_CODEC_VERSION = 1;
export const PAYLOAD_CODEC_ALGORITHM = "ck-aes-256-gcm-v1";

const ENCRYPTION_KEY_SALT = utf8ToBytes("camkeeper/nostr-sync/v1/encryption");
const ENCRYPTION_KEY_INFO = utf8ToBytes("camkeeper/payload-key");
const PAYLOAD_AAD = utf8ToBytes("camkeeper/nostr-sync/payload/v1");
const AES_GCM_IV_LENGTH = 12;

function getSubtleCrypto() {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("WebCrypto subtle API is unavailable.");
  }
  return subtle;
}

async function derivePayloadKey(privateKeyHex) {
  const normalizedPrivateKeyHex = normalizePrivateKeyHex(privateKeyHex);
  return hkdfSha256({
    ikm: hexToBytes(normalizedPrivateKeyHex),
    salt: ENCRYPTION_KEY_SALT,
    info: ENCRYPTION_KEY_INFO,
    length: 32,
  });
}

async function importAesKey(privateKeyHex, usages) {
  const subtle = getSubtleCrypto();
  const keyBytes = await derivePayloadKey(privateKeyHex);
  return subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    usages,
  );
}

function normalizeEncryptedPayloadEnvelope(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    v: Number.isFinite(source.v) ? Math.floor(source.v) : 0,
    alg: typeof source.alg === "string" ? source.alg : "",
    iv: typeof source.iv === "string" ? source.iv : "",
    ct: typeof source.ct === "string" ? source.ct : "",
  };
}

export async function encryptPayloadEnvelope(privateKeyHex, payload) {
  const subtle = getSubtleCrypto();
  const key = await importAesKey(privateKeyHex, ["encrypt"]);
  const iv = randomBytes(AES_GCM_IV_LENGTH);
  const plaintext = utf8ToBytes(JSON.stringify(payload));
  const ciphertext = await subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: PAYLOAD_AAD,
      tagLength: 128,
    },
    key,
    plaintext,
  );
  return JSON.stringify({
    v: PAYLOAD_CODEC_VERSION,
    alg: PAYLOAD_CODEC_ALGORITHM,
    iv: bytesToBase64Url(iv),
    ct: bytesToBase64Url(new Uint8Array(ciphertext)),
  });
}

export async function decryptPayloadEnvelope(privateKeyHex, encodedContent) {
  const subtle = getSubtleCrypto();
  const key = await importAesKey(privateKeyHex, ["decrypt"]);

  let parsed;
  try {
    parsed = JSON.parse(typeof encodedContent === "string" ? encodedContent : "");
  } catch (error) {
    throw new Error("Encrypted payload is not valid JSON.");
  }

  const envelope = normalizeEncryptedPayloadEnvelope(parsed);
  if (envelope.v !== PAYLOAD_CODEC_VERSION) {
    throw new Error("Encrypted payload version is not supported.");
  }
  if (envelope.alg !== PAYLOAD_CODEC_ALGORITHM) {
    throw new Error("Encrypted payload algorithm is not supported.");
  }

  const iv = base64UrlToBytes(envelope.iv);
  if (iv.length !== AES_GCM_IV_LENGTH) {
    throw new Error("Encrypted payload IV is invalid.");
  }
  const ciphertext = base64UrlToBytes(envelope.ct);
  if (!ciphertext.length) {
    throw new Error("Encrypted payload ciphertext is missing.");
  }

  let plaintext;
  try {
    plaintext = await subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: PAYLOAD_AAD,
        tagLength: 128,
      },
      key,
      ciphertext,
    );
  } catch (error) {
    throw new Error("Failed to decrypt payload.");
  }

  try {
    return JSON.parse(bytesToUtf8(new Uint8Array(plaintext)));
  } catch (error) {
    throw new Error("Decrypted payload JSON is invalid.");
  }
}
