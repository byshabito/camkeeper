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

import { concatBytes } from "./encoding.js";

function getSubtleCrypto() {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("WebCrypto subtle API is unavailable.");
  }
  return subtle;
}

function normalizeBytes(value) {
  return value instanceof Uint8Array ? value : Uint8Array.from(value || []);
}

export async function hmacSha256(keyBytes, ...messageParts) {
  const key = normalizeBytes(keyBytes);
  const message = concatBytes(...messageParts.map((part) => normalizeBytes(part)));
  const subtle = getSubtleCrypto();
  const importedKey = await subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await subtle.sign("HMAC", importedKey, message);
  return new Uint8Array(signature);
}

export async function hkdfSha256({
  ikm,
  salt,
  info = new Uint8Array(),
  length = 32,
}) {
  const inputKeyMaterial = normalizeBytes(ikm);
  const saltBytes = normalizeBytes(salt);
  const infoBytes = normalizeBytes(info);

  if (!Number.isSafeInteger(length) || length <= 0) {
    throw new Error("HKDF length must be a positive integer.");
  }
  if (length > 32 * 255) {
    throw new Error("HKDF length exceeds SHA-256 expansion limit.");
  }

  const prk = await hmacSha256(saltBytes, inputKeyMaterial);
  const blocks = [];
  let previous = new Uint8Array();
  let generated = 0;
  let counter = 1;

  while (generated < length) {
    previous = await hmacSha256(prk, previous, infoBytes, Uint8Array.of(counter));
    blocks.push(previous);
    generated += previous.length;
    counter += 1;
  }

  return concatBytes(...blocks).slice(0, length);
}
