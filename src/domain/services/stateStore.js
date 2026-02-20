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

import { getState as loadState, setState as persistState } from "../../repo/state.js";
import {
  ACTIVE_VIEW_SESSIONS_STATE_KEY,
  DEBUG_LOGGING_STATE_KEY,
  NOSTR_SYNC_NSEC_STATE_KEY,
  NOSTR_SYNC_SECRET_VAULT_STATE_KEY,
} from "../stateKeys.js";
import { debugLog } from "../debugLogging.js";

const STATE_CRUD_LOG_PREFIX = "[CamKeeper][crud][state]";

function logStateCrud(message, details) {
  debugLog(STATE_CRUD_LOG_PREFIX, message, details);
}

function summarizeStateValue(key, value) {
  if (key === DEBUG_LOGGING_STATE_KEY) {
    return Boolean(value);
  }
  if (key === NOSTR_SYNC_NSEC_STATE_KEY) {
    return "<redacted>";
  }
  if (key === NOSTR_SYNC_SECRET_VAULT_STATE_KEY) {
    return "<redacted>";
  }
  if (key === ACTIVE_VIEW_SESSIONS_STATE_KEY) {
    return {
      sessionCount: Array.isArray(value) ? value.length : 0,
    };
  }
  if (value === null) return null;
  if (Array.isArray(value)) {
    return {
      type: "array",
      length: value.length,
    };
  }
  if (typeof value === "object") {
    return {
      type: "object",
      keys: Object.keys(value || {}).length,
    };
  }
  if (typeof value === "string") {
    return {
      type: "string",
      length: value.length,
    };
  }
  return value;
}

export async function getState(key) {
  return loadState(key);
}

export async function setState(key, value) {
  const saved = await persistState(key, value);
  logStateCrud("setState", {
    key,
    value: summarizeStateValue(key, value),
  });
  return saved;
}
