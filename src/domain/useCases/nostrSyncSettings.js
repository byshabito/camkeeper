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

import { getSettings, updateSettings } from "../services/settingsStore.js";
import { getState, setState } from "../services/stateStore.js";
import {
  normalizeNostrSecret,
  normalizeNostrSyncSettings,
  normalizeNostrSyncStatus,
} from "../nostrSync.js";
import {
  NOSTR_SYNC_NSEC_STATE_KEY,
  NOSTR_SYNC_SECRET_VAULT_STATE_KEY,
  NOSTR_SYNC_STATUS_STATE_KEY,
} from "../stateKeys.js";
import {
  generateNsec,
  normalizePrivateKeyHex,
  privateKeyHexFromNsec,
} from "../../repo/nostr/index.js";
import {
  decryptSecret,
  encryptSecret,
  isSecretVault,
} from "../../repo/nostr/secretVault.js";

let cachedNostrSecret = "";

function clearCachedNostrSecret() {
  cachedNostrSecret = "";
}

function setCachedNostrSecret(secret) {
  cachedNostrSecret = normalizeNostrSecret(secret);
}

function normalizePassphrase(value) {
  return typeof value === "string" ? value : "";
}

function requirePassphrase(passphrase, { confirmPassphrase = null, requireConfirm = false } = {}) {
  const normalizedPassphrase = normalizePassphrase(passphrase);
  if (!normalizedPassphrase) {
    throw new Error("Passphrase is required to unlock your Nostr key.");
  }
  if (requireConfirm && normalizedPassphrase !== normalizePassphrase(confirmPassphrase)) {
    throw new Error("Passphrase confirmation does not match.");
  }
  return normalizedPassphrase;
}

function normalizeSecretForStorage(secret) {
  const rawSecret = normalizeNostrSecret(secret);
  if (!rawSecret) {
    throw new Error("Nostr secret is required.");
  }
  const normalizedNsecCandidate = rawSecret.toLowerCase();
  if (normalizedNsecCandidate.startsWith("nsec1")) {
    privateKeyHexFromNsec(normalizedNsecCandidate);
    return normalizedNsecCandidate;
  }
  return normalizePrivateKeyHex(rawSecret);
}

async function readSecretVaultState() {
  const stored = await getState(NOSTR_SYNC_SECRET_VAULT_STATE_KEY);
  return isSecretVault(stored) ? stored : null;
}

async function readLegacySecretState() {
  const stored = await getState(NOSTR_SYNC_NSEC_STATE_KEY);
  return normalizeNostrSecret(stored);
}

async function persistSecretVault({ normalizedSecret, passphrase }) {
  const vault = await encryptSecret({
    secret: normalizedSecret,
    passphrase,
  });
  await setState(NOSTR_SYNC_SECRET_VAULT_STATE_KEY, vault);
  await setState(NOSTR_SYNC_NSEC_STATE_KEY, "");
}

export async function getNostrSyncConfig() {
  const settings = await getSettings();
  return normalizeNostrSyncSettings(settings.nostrSync);
}

export async function updateNostrSyncConfig(patch) {
  const source = patch && typeof patch === "object" ? patch : {};
  const normalizedPatch = {};
  if (Object.hasOwn(source, "enabled")) {
    normalizedPatch.enabled = source.enabled;
  }
  if (Object.hasOwn(source, "signerType")) {
    normalizedPatch.signerType = source.signerType;
  }
  if (Object.hasOwn(source, "relays")) {
    normalizedPatch.relays = source.relays;
    normalizedPatch.relaysCustomized = true;
  }
  if (Object.hasOwn(source, "relaysCustomized")) {
    normalizedPatch.relaysCustomized = source.relaysCustomized;
  }
  if (Object.hasOwn(source, "autoPush")) {
    normalizedPatch.autoPush = source.autoPush;
  }
  const updated = await updateSettings((current) => {
    const base = normalizeNostrSyncSettings(current?.nostrSync);
    return {
      ...current,
      nostrSync: normalizeNostrSyncSettings({
        ...base,
        ...normalizedPatch,
      }),
    };
  });
  return normalizeNostrSyncSettings(updated.nostrSync);
}

export async function getNostrSyncSecret() {
  return cachedNostrSecret;
}

export async function hasNostrSyncSecret() {
  if (cachedNostrSecret) return true;
  const vault = await readSecretVaultState();
  if (vault) return true;
  const legacySecret = await readLegacySecretState();
  return Boolean(legacySecret);
}

export async function resolveNostrSyncSecretForSync({ passphrase } = {}) {
  if (cachedNostrSecret) {
    return cachedNostrSecret;
  }

  const vault = await readSecretVaultState();
  if (vault) {
    const passphraseValue = requirePassphrase(passphrase);
    const decrypted = await decryptSecret({
      vault,
      passphrase: passphraseValue,
    });
    const normalizedSecret = normalizeSecretForStorage(decrypted);
    setCachedNostrSecret(normalizedSecret);
    return normalizedSecret;
  }

  const legacySecret = await readLegacySecretState();
  if (!legacySecret) {
    throw new Error("No local Nostr private key is configured.");
  }

  const passphraseValue = requirePassphrase(passphrase);
  const normalizedSecret = normalizeSecretForStorage(legacySecret);
  await persistSecretVault({
    normalizedSecret,
    passphrase: passphraseValue,
  });
  setCachedNostrSecret(normalizedSecret);
  return normalizedSecret;
}

export async function setNostrSyncSecret(value, { passphrase, confirmPassphrase } = {}) {
  const rawSecret = normalizeNostrSecret(value);
  if (!rawSecret) {
    await clearNostrSyncSecret();
    return false;
  }
  const passphraseValue = requirePassphrase(passphrase, {
    confirmPassphrase,
    requireConfirm: true,
  });
  const normalizedSecret = normalizeSecretForStorage(rawSecret);
  await persistSecretVault({
    normalizedSecret,
    passphrase: passphraseValue,
  });
  setCachedNostrSecret(normalizedSecret);
  return true;
}

export async function clearNostrSyncSecret() {
  clearCachedNostrSecret();
  await setState(NOSTR_SYNC_SECRET_VAULT_STATE_KEY, null);
  await setState(NOSTR_SYNC_NSEC_STATE_KEY, "");
}

export async function getNostrSyncStatus() {
  const stored = await getState(NOSTR_SYNC_STATUS_STATE_KEY);
  return normalizeNostrSyncStatus(stored);
}

export async function setNostrSyncStatus(status) {
  const normalized = normalizeNostrSyncStatus(status);
  await setState(NOSTR_SYNC_STATUS_STATE_KEY, normalized);
  return normalized;
}

export async function clearNostrSyncStatus() {
  await setState(NOSTR_SYNC_STATUS_STATE_KEY, null);
  return normalizeNostrSyncStatus(null);
}

export async function generateNostrSyncSecret({ passphrase, confirmPassphrase } = {}) {
  const passphraseValue = requirePassphrase(passphrase, {
    confirmPassphrase,
    requireConfirm: true,
  });
  const generatedNsec = generateNsec();
  await persistSecretVault({
    normalizedSecret: generatedNsec,
    passphrase: passphraseValue,
  });
  setCachedNostrSecret(generatedNsec);
  return generatedNsec;
}
