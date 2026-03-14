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
  NOSTR_SYNC_NPUB_STATE_KEY,
  NOSTR_SYNC_STATUS_STATE_KEY,
} from "../stateKeys.js";
import {
  generateNsec,
  getPublicKeyNpubFromPrivateKeyHex,
  normalizePrivateKeyHex,
  privateKeyHexToNsec,
  privateKeyHexFromNsec,
} from "../../repo/nostr/index.js";

const LEGACY_NOSTR_SYNC_SECRET_VAULT_STATE_KEY = "camkeeper_nostr_sync_secret_vault_v1";

let cachedNostrSecret = "";

function clearCachedNostrSecret() {
  cachedNostrSecret = "";
}

function setCachedNostrSecret(secret) {
  cachedNostrSecret = normalizeNostrSecret(secret);
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
  const normalizedHex = normalizePrivateKeyHex(rawSecret);
  return privateKeyHexToNsec(normalizedHex);
}

function deriveNpubFromStoredSecret(secret) {
  const normalizedSecret = normalizeSecretForStorage(secret);
  const privateKeyHex = privateKeyHexFromNsec(normalizedSecret);
  return getPublicKeyNpubFromPrivateKeyHex(privateKeyHex);
}

async function readStoredNostrSecretState() {
  const stored = await getState(NOSTR_SYNC_NSEC_STATE_KEY);
  return normalizeNostrSecret(stored);
}

async function clearLegacySecretVaultState() {
  await setState(LEGACY_NOSTR_SYNC_SECRET_VAULT_STATE_KEY, null);
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
  if (cachedNostrSecret) {
    return cachedNostrSecret;
  }
  const storedSecret = await readStoredNostrSecretState();
  if (!storedSecret) {
    return "";
  }
  let normalizedSecret = "";
  try {
    normalizedSecret = normalizeSecretForStorage(storedSecret);
  } catch (error) {
    return "";
  }
  if (normalizedSecret !== storedSecret) {
    await setState(NOSTR_SYNC_NSEC_STATE_KEY, normalizedSecret);
  }
  const derivedNpub = deriveNpubFromStoredSecret(normalizedSecret);
  const storedNpub = normalizeNostrSecret(await getState(NOSTR_SYNC_NPUB_STATE_KEY));
  if (derivedNpub !== storedNpub) {
    await setState(NOSTR_SYNC_NPUB_STATE_KEY, derivedNpub);
  }
  setCachedNostrSecret(normalizedSecret);
  return normalizedSecret;
}

export async function hasNostrSyncSecret() {
  return Boolean(await getNostrSyncSecret());
}

export async function resolveNostrSyncSecretForSync() {
  const secret = await getNostrSyncSecret();
  if (!secret) {
    throw new Error("No local Nostr private key is configured.");
  }
  return secret;
}

export async function setNostrSyncSecret(value) {
  const rawSecret = normalizeNostrSecret(value);
  if (!rawSecret) {
    await clearNostrSyncSecret();
    return false;
  }
  const normalizedSecret = normalizeSecretForStorage(rawSecret);
  const derivedNpub = deriveNpubFromStoredSecret(normalizedSecret);
  await setState(NOSTR_SYNC_NSEC_STATE_KEY, normalizedSecret);
  await setState(NOSTR_SYNC_NPUB_STATE_KEY, derivedNpub);
  await clearLegacySecretVaultState();
  setCachedNostrSecret(normalizedSecret);
  return true;
}

export async function clearNostrSyncSecret() {
  clearCachedNostrSecret();
  await setState(NOSTR_SYNC_NSEC_STATE_KEY, "");
  await setState(NOSTR_SYNC_NPUB_STATE_KEY, "");
  await clearLegacySecretVaultState();
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

export async function generateNostrSyncSecret() {
  const generatedNsec = generateNsec();
  const derivedNpub = deriveNpubFromStoredSecret(generatedNsec);
  await setState(NOSTR_SYNC_NSEC_STATE_KEY, generatedNsec);
  await setState(NOSTR_SYNC_NPUB_STATE_KEY, derivedNpub);
  await clearLegacySecretVaultState();
  setCachedNostrSecret(generatedNsec);
  return generatedNsec;
}
