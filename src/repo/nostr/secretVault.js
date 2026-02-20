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

const SECRET_VAULT_VERSION = 1;
const PBKDF2_ITERATIONS = 210000;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function ensureSubtleCrypto() {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("WebCrypto is unavailable in this browser context.");
  }
  return subtle;
}

function toBase64(bytes) {
  if (!(bytes instanceof Uint8Array)) {
    throw new Error("Expected Uint8Array for base64 encoding.");
  }
  const btoaFn = globalThis.btoa;
  if (typeof btoaFn !== "function") {
    throw new Error("Base64 encoding is unavailable in this browser context.");
  }
  let binary = "";
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoaFn(binary);
}

function fromBase64(value) {
  const atobFn = globalThis.atob;
  if (typeof atobFn !== "function") {
    throw new Error("Base64 decoding is unavailable in this browser context.");
  }
  const binary = atobFn(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function normalizePassphrase(passphrase) {
  if (typeof passphrase !== "string" || !passphrase.length) {
    throw new Error("Passphrase is required.");
  }
  return passphrase;
}

function normalizeSecret(secret) {
  if (typeof secret !== "string" || !secret.length) {
    throw new Error("Secret is required.");
  }
  return secret;
}

async function deriveAesKey({ passphrase, salt, iterations, usages }) {
  const subtle = ensureSubtleCrypto();
  const keyMaterial = await subtle.importKey(
    "raw",
    textEncoder.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    usages,
  );
}

export function isSecretVault(value) {
  if (!value || typeof value !== "object") return false;
  if (value.v !== SECRET_VAULT_VERSION) return false;
  if (value.kdf !== "PBKDF2") return false;
  if (!Number.isFinite(value.iter) || value.iter <= 0) return false;
  if (typeof value.saltB64 !== "string" || !value.saltB64) return false;
  if (typeof value.ivB64 !== "string" || !value.ivB64) return false;
  if (typeof value.cipherB64 !== "string" || !value.cipherB64) return false;
  return true;
}

export async function encryptSecret({ secret, passphrase }) {
  const normalizedSecret = normalizeSecret(secret);
  const normalizedPassphrase = normalizePassphrase(passphrase);
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) {
    throw new Error("Secure randomness is unavailable in this browser context.");
  }

  const salt = cryptoApi.getRandomValues(new Uint8Array(16));
  const iv = cryptoApi.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey({
    passphrase: normalizedPassphrase,
    salt,
    iterations: PBKDF2_ITERATIONS,
    usages: ["encrypt"],
  });
  const subtle = ensureSubtleCrypto();
  const encrypted = await subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    textEncoder.encode(normalizedSecret),
  );

  return {
    v: SECRET_VAULT_VERSION,
    kdf: "PBKDF2",
    iter: PBKDF2_ITERATIONS,
    saltB64: toBase64(salt),
    ivB64: toBase64(iv),
    cipherB64: toBase64(new Uint8Array(encrypted)),
  };
}

export async function decryptSecret({ vault, passphrase }) {
  if (!isSecretVault(vault)) {
    throw new Error("Encrypted key vault is invalid.");
  }
  const normalizedPassphrase = normalizePassphrase(passphrase);
  const salt = fromBase64(vault.saltB64);
  const iv = fromBase64(vault.ivB64);
  const cipherBytes = fromBase64(vault.cipherB64);
  const key = await deriveAesKey({
    passphrase: normalizedPassphrase,
    salt,
    iterations: vault.iter,
    usages: ["decrypt"],
  });

  const subtle = ensureSubtleCrypto();
  let decrypted;
  try {
    decrypted = await subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      cipherBytes,
    );
  } catch (error) {
    throw new Error("Passphrase is incorrect or encrypted key data is corrupted.");
  }
  return textDecoder.decode(new Uint8Array(decrypted));
}
