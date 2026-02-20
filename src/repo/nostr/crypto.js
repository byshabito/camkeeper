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

import { generateSecretKey, getPublicKey } from "nostr-tools/pure";
import { decode as decodeNip19, nsecEncode } from "nostr-tools/nip19";
import { bytesToHex, hexToBytes } from "./encoding.js";

function normalizePrivateKeyBytes(bytes) {
  const source = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes || []);
  if (source.length !== 32) {
    throw new Error("Private key must be 32 bytes.");
  }
  try {
    getPublicKey(source);
  } catch (error) {
    throw new Error("Private key must be a valid secp256k1 scalar.");
  }
  return source;
}

export function decodeNsecToPrivateKeyBytes(nsec) {
  const value = typeof nsec === "string" ? nsec.trim().toLowerCase() : "";
  if (!value) {
    throw new Error("nsec value is required.");
  }

  let decoded;
  try {
    decoded = decodeNip19(value);
  } catch (error) {
    throw new Error("Invalid nsec prefix.");
  }

  if (!decoded || decoded.type !== "nsec") {
    throw new Error("Invalid nsec prefix.");
  }

  return normalizePrivateKeyBytes(decoded.data);
}

export function privateKeyHexToNsec(privateKeyHex) {
  const privateKeyBytes = normalizePrivateKeyBytes(hexToBytes(privateKeyHex));
  return nsecEncode(privateKeyBytes);
}

export function generateNsec() {
  return nsecEncode(generateSecretKey());
}

export function privateKeyHexFromNsec(nsec) {
  return bytesToHex(decodeNsecToPrivateKeyBytes(nsec));
}

export function normalizePrivateKeyHex(privateKeyHex) {
  return bytesToHex(normalizePrivateKeyBytes(hexToBytes(privateKeyHex)));
}

export function getPublicKeyHexFromPrivateKeyHex(privateKeyHex) {
  const privateKeyBytes = normalizePrivateKeyBytes(hexToBytes(privateKeyHex));
  return getPublicKey(privateKeyBytes);
}
