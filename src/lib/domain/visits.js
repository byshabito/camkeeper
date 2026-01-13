/*
 * CamKeeper - Creator profile and livestream bookmark manager
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

const MAX_VIEW_HISTORY_DAYS = 200;

export function getDayStartMs(ts) {
  const day = new Date(ts);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
}

export function updateViewHistory(history, endedAt, durationMs, maxDays = MAX_VIEW_HISTORY_DAYS) {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return Array.isArray(history) ? history : [];
  }

  const dayStart = getDayStartMs(endedAt);
  let dayFound = false;
  const nextHistory = (Array.isArray(history) ? history : [])
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const entryDayStart = Number.isFinite(entry.dayStart)
        ? entry.dayStart
        : Number.isFinite(entry.endedAt)
          ? getDayStartMs(entry.endedAt)
          : null;
      const entryDuration = Number.isFinite(entry.durationMs) ? entry.durationMs : 0;
      if (!Number.isFinite(entryDayStart) || entryDuration <= 0) return null;
      if (entryDayStart === dayStart) {
        dayFound = true;
        return {
          dayStart: entryDayStart,
          durationMs: entryDuration + durationMs,
        };
      }
      return { dayStart: entryDayStart, durationMs: entryDuration };
    })
    .filter(Boolean);

  if (!dayFound) {
    nextHistory.push({ dayStart, durationMs });
  }

  nextHistory.sort((a, b) => a.dayStart - b.dayStart);
  if (nextHistory.length > maxDays) {
    nextHistory.splice(0, nextHistory.length - maxDays);
  }

  return nextHistory;
}
