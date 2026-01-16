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

import { parseUrl } from "./urls.js";

export const LEGACY_ACTIVE_VIEW_SESSION_STATE_KEY = "camkeeper_active_view_session_v1";

export function coerceSession(stored) {
  if (!stored || typeof stored !== "object") return null;
  if (!Number.isFinite(stored.startedAt)) return null;
  if (!Number.isFinite(stored.tabId)) return null;
  if (typeof stored.site !== "string" || typeof stored.username !== "string") return null;
  return stored;
}

export function coerceSessionList(stored) {
  if (!Array.isArray(stored)) return [];
  return stored.map((item) => coerceSession(item)).filter(Boolean);
}

export function parseVisitUrl(url, sites) {
  if (!url || !sites) return null;
  return parseUrl(url, sites);
}

export function buildSession({ tabId, parsed, startedAt }) {
  if (!parsed) return null;
  return {
    tabId,
    site: parsed.site,
    username: parsed.username,
    startedAt,
  };
}
