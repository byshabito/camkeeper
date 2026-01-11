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
