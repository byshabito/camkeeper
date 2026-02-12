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

const HEX_REGEX = /^[0-9a-f]+$/i;

export function utf8ToBytes(value) {
  return new TextEncoder().encode(typeof value === "string" ? value : "");
}

export function bytesToUtf8(bytes) {
  return new TextDecoder().decode(bytes || new Uint8Array());
}

export function concatBytes(...parts) {
  const arrays = parts.filter(Boolean).map((part) => (part instanceof Uint8Array
    ? part
    : Uint8Array.from(part)));
  const total = arrays.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  arrays.forEach((part) => {
    result.set(part, offset);
    offset += part.length;
  });
  return result;
}

export function bytesToHex(bytes) {
  const source = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes || []);
  return Array.from(source, (value) => value.toString(16).padStart(2, "0")).join("");
}

export function bytesToBase64(bytes) {
  const source = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes || []);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(source).toString("base64");
  }
  let binary = "";
  source.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  if (typeof btoa !== "function") {
    throw new Error("Base64 encoding is unavailable.");
  }
  return btoa(binary);
}

export function base64ToBytes(value) {
  const input = typeof value === "string" ? value.trim() : "";
  if (!input) return new Uint8Array();
  if (typeof Buffer !== "undefined") {
    return Uint8Array.from(Buffer.from(input, "base64"));
  }
  if (typeof atob !== "function") {
    throw new Error("Base64 decoding is unavailable.");
  }
  const binary = atob(input);
  const output = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    output[index] = binary.charCodeAt(index);
  }
  return output;
}

export function bytesToBase64Url(bytes) {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlToBytes(value) {
  const input = typeof value === "string" ? value.trim() : "";
  if (!input) return new Uint8Array();
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = normalized.length % 4;
  const padded = padLength ? `${normalized}${"=".repeat(4 - padLength)}` : normalized;
  return base64ToBytes(padded);
}

export function hexToBytes(value) {
  const hex = typeof value === "string" ? value.trim() : "";
  if (!hex || hex.length % 2 !== 0 || !HEX_REGEX.test(hex)) {
    throw new Error("Invalid hex input.");
  }
  const output = new Uint8Array(hex.length / 2);
  for (let index = 0; index < output.length; index += 1) {
    const offset = index * 2;
    output[index] = Number.parseInt(hex.slice(offset, offset + 2), 16);
  }
  return output;
}

export async function sha256Bytes(input) {
  const bytes = input instanceof Uint8Array ? input : Uint8Array.from(input || []);
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("WebCrypto is unavailable.");
  }
  const digest = await subtle.digest("SHA-256", bytes);
  return new Uint8Array(digest);
}

export function randomBytes(length = 32) {
  if (!Number.isSafeInteger(length) || length <= 0) {
    throw new Error("randomBytes length must be a positive integer.");
  }
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) {
    throw new Error("CSPRNG is unavailable.");
  }
  return cryptoApi.getRandomValues(new Uint8Array(length));
}
