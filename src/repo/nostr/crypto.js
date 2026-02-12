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
  CURVE,
  ProjectivePoint,
  etc as secpEtc,
  utils as secpUtils,
} from "../../vendor/noble-secp256k1/index.js";
import { bech32 } from "../../vendor/bech32/index.js";
import {
  bytesToHex,
  concatBytes,
  hexToBytes,
  randomBytes,
  sha256Bytes,
  utf8ToBytes,
} from "./encoding.js";

const NSEC_PREFIX = "nsec";
const BECH32_MAX_SIZE = 5000;
const TAGGED_HASH_PREFIXES = new Map();

function toScalar(value) {
  return secpUtils.normPrivateKeyToScalar(value);
}

function modN(value) {
  return secpEtc.mod(value, CURVE.n);
}

function normalizePrivateKeyBytes(bytes) {
  const key = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes || []);
  if (key.length !== 32) {
    throw new Error("Private key must be 32 bytes.");
  }
  if (!secpUtils.isValidPrivateKey(key)) {
    throw new Error("Private key is outside secp256k1 scalar range.");
  }
  return key;
}

function normalizeMessageHashBytes(bytes) {
  const hash = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes || []);
  if (hash.length !== 32) {
    throw new Error("Message hash must be 32 bytes.");
  }
  return hash;
}

function normalizePublicKeyHex(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw new Error("Public key must be 32-byte lowercase hex.");
  }
  return normalized;
}

function normalizeSignatureHex(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[0-9a-f]{128}$/.test(normalized)) {
    throw new Error("Schnorr signature must be 64-byte lowercase hex.");
  }
  return normalized;
}

function xorBytes(left, right) {
  if (!(left instanceof Uint8Array) || !(right instanceof Uint8Array) || left.length !== right.length) {
    throw new Error("xorBytes inputs must be same-length Uint8Array values.");
  }
  const output = new Uint8Array(left.length);
  for (let index = 0; index < left.length; index += 1) {
    output[index] = left[index] ^ right[index];
  }
  return output;
}

function isEvenY(point) {
  return (point.y & 1n) === 0n;
}

function pointToXOnlyBytes(point) {
  return point.toRawBytes(true).slice(1);
}

function numberTo32Bytes(value) {
  return secpEtc.numberToBytesBE(value);
}

async function taggedHash(tag, ...messages) {
  let prefix = TAGGED_HASH_PREFIXES.get(tag);
  if (!prefix) {
    const tagHash = await sha256Bytes(utf8ToBytes(tag));
    prefix = concatBytes(tagHash, tagHash);
    TAGGED_HASH_PREFIXES.set(tag, prefix);
  }
  return sha256Bytes(concatBytes(prefix, ...messages));
}

async function computeChallenge(rxBytes, publicKeyBytes, messageHashBytes) {
  const challengeHash = await taggedHash("BIP0340/challenge", rxBytes, publicKeyBytes, messageHashBytes);
  return modN(secpEtc.bytesToNumberBE(challengeHash));
}

function liftX(publicKeyHex) {
  return ProjectivePoint.fromHex(`02${publicKeyHex}`);
}

export function decodeNsecToPrivateKeyBytes(nsec) {
  const value = typeof nsec === "string" ? nsec.trim() : "";
  if (!value) {
    throw new Error("nsec value is required.");
  }
  const decoded = bech32.decode(value, BECH32_MAX_SIZE);
  if (!decoded || decoded.prefix !== NSEC_PREFIX) {
    throw new Error("Invalid nsec prefix.");
  }
  const bytes = Uint8Array.from(bech32.fromWords(decoded.words));
  return normalizePrivateKeyBytes(bytes);
}

export function privateKeyHexToNsec(privateKeyHex) {
  const privateKeyBytes = normalizePrivateKeyBytes(hexToBytes(privateKeyHex));
  return bech32.encode(NSEC_PREFIX, bech32.toWords(privateKeyBytes), BECH32_MAX_SIZE);
}

export function generateNsec() {
  const privateKeyBytes = secpUtils.randomPrivateKey();
  return bech32.encode(NSEC_PREFIX, bech32.toWords(privateKeyBytes), BECH32_MAX_SIZE);
}

export function privateKeyHexFromNsec(nsec) {
  return bytesToHex(decodeNsecToPrivateKeyBytes(nsec));
}

export function normalizePrivateKeyHex(privateKeyHex) {
  const key = normalizePrivateKeyBytes(hexToBytes(privateKeyHex));
  return bytesToHex(key);
}

export function getPublicKeyHexFromPrivateKeyHex(privateKeyHex) {
  const privateKeyBytes = normalizePrivateKeyBytes(hexToBytes(privateKeyHex));
  const point = ProjectivePoint.fromPrivateKey(privateKeyBytes);
  return bytesToHex(pointToXOnlyBytes(point));
}

export async function signSchnorr(messageHashBytes, privateKeyHex, { auxRand } = {}) {
  const messageHash = normalizeMessageHashBytes(messageHashBytes);
  const privateKeyBytes = normalizePrivateKeyBytes(hexToBytes(privateKeyHex));

  const d0 = toScalar(privateKeyBytes);
  const p = ProjectivePoint.fromPrivateKey(d0);
  const d = isEvenY(p) ? d0 : modN(-d0);
  const publicKeyBytes = pointToXOnlyBytes(p);

  const aux = auxRand ? normalizeMessageHashBytes(auxRand) : randomBytes(32);
  const dBytes = numberTo32Bytes(d);
  const t = xorBytes(dBytes, await taggedHash("BIP0340/aux", aux));
  const nonceHash = await taggedHash("BIP0340/nonce", t, publicKeyBytes, messageHash);
  const k0 = modN(secpEtc.bytesToNumberBE(nonceHash));

  if (k0 === 0n) {
    throw new Error("Schnorr nonce derived to zero.");
  }

  const rPoint = ProjectivePoint.fromPrivateKey(k0);
  const k = isEvenY(rPoint) ? k0 : modN(-k0);
  const rxBytes = pointToXOnlyBytes(rPoint);
  const e = await computeChallenge(rxBytes, publicKeyBytes, messageHash);
  const s = modN(k + e * d);
  const signatureBytes = concatBytes(rxBytes, numberTo32Bytes(s));
  const signatureHex = bytesToHex(signatureBytes);
  const publicKeyHex = bytesToHex(publicKeyBytes);
  const verified = await verifySchnorr(signatureHex, messageHash, publicKeyHex);
  if (!verified) {
    throw new Error("Generated Schnorr signature failed verification.");
  }
  return signatureHex;
}

export async function verifySchnorr(signatureHex, messageHashBytes, publicKeyHex) {
  const normalizedPublicKeyHex = normalizePublicKeyHex(publicKeyHex);
  const normalizedSignatureHex = normalizeSignatureHex(signatureHex);
  const messageHash = normalizeMessageHashBytes(messageHashBytes);

  const signatureBytes = hexToBytes(normalizedSignatureHex);
  const r = secpEtc.bytesToNumberBE(signatureBytes.slice(0, 32));
  const s = secpEtc.bytesToNumberBE(signatureBytes.slice(32, 64));

  if (r <= 0n || r >= CURVE.p) return false;
  if (s <= 0n || s >= CURVE.n) return false;

  let point;
  try {
    point = liftX(normalizedPublicKeyHex);
  } catch (error) {
    return false;
  }

  const publicKeyBytes = hexToBytes(normalizedPublicKeyHex);
  const e = await computeChallenge(numberTo32Bytes(r), publicKeyBytes, messageHash);
  let resultPoint;
  try {
    resultPoint = ProjectivePoint.BASE.mulAddQUns(point, s, modN(-e));
  } catch (error) {
    return false;
  }
  if (!resultPoint) return false;
  if (!isEvenY(resultPoint)) return false;
  return resultPoint.x === r;
}
