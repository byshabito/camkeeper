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

import { updateViewHistory } from "./visits.js";

export function applyProfileView({ profiles, site, username, endedAt, durationMs }) {
  if (!site || !username) {
    return { profiles: profiles || [], updated: false };
  }
  let updatedAny = false;
  const updated = (profiles || []).map((profile) => {
    const cams = (profile.cams || []).map((cam) => {
      if (cam.site === site && cam.username === username) {
        updatedAny = true;
        const existing = Number.isFinite(cam.viewMs) ? cam.viewMs : 0;
        const history = Array.isArray(cam.viewHistory) ? cam.viewHistory : [];
        const nextHistory = updateViewHistory(history, endedAt, durationMs);
        return {
          ...cam,
          viewMs: existing + durationMs,
          lastViewedAt: endedAt,
          viewHistory: nextHistory,
        };
      }
      return cam;
    });
    return { ...profile, cams };
  });
  return { profiles: updated, updated: updatedAny };
}
