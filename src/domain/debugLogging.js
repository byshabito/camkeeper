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

import { DEBUG_LOGGING_STATE_KEY } from "./stateKeys.js";

let debugLoggingEnabled = false;
let debugLoggingInitialized = false;
let debugLoggingInitStarted = false;
let storageListenerRegistered = false;

function getRuntimeDebugOverride() {
  const override = globalThis.__CAMKEEPER_DEBUG_LOGS__;
  return typeof override === "boolean" ? override : null;
}

function updateDebugLoggingEnabled(value) {
  debugLoggingEnabled = Boolean(value);
  debugLoggingInitialized = true;
}

function readDebugLoggingSetting() {
  const storage = globalThis.chrome?.storage?.local;
  if (!storage?.get) {
    debugLoggingInitialized = true;
    return;
  }

  storage.get(DEBUG_LOGGING_STATE_KEY, (result) => {
    if (globalThis.chrome?.runtime?.lastError) return;
    updateDebugLoggingEnabled(result?.[DEBUG_LOGGING_STATE_KEY]);
  });
}

function registerStorageListener() {
  if (storageListenerRegistered || !globalThis.chrome?.storage?.onChanged?.addListener) return;
  globalThis.chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    const hasDebugKey = Object.prototype.hasOwnProperty.call(changes || {}, DEBUG_LOGGING_STATE_KEY);
    if (!hasDebugKey) return;
    updateDebugLoggingEnabled(changes[DEBUG_LOGGING_STATE_KEY]?.newValue);
  });
  storageListenerRegistered = true;
}

function ensureDebugLoggingInitialized() {
  if (debugLoggingInitStarted || debugLoggingInitialized) return;
  debugLoggingInitStarted = true;
  readDebugLoggingSetting();
  registerStorageListener();
}

export function isDebugLoggingEnabled() {
  const override = getRuntimeDebugOverride();
  if (override !== null) return override;
  ensureDebugLoggingInitialized();
  return debugLoggingEnabled;
}

export function debugLog(prefix, message, details) {
  if (!isDebugLoggingEnabled()) return;
  const text = `${prefix} ${message}`;
  if (typeof details === "undefined") {
    console.log(text);
    return;
  }
  console.log(text, details);
}
