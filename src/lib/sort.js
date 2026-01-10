export function sortBySelection(items, mode) {
  const list = items.slice();
  const pinWeight = (profile) => (profile && profile.pinned ? 0 : 1);
  switch (mode) {
    case "name":
      return list.sort(
        (a, b) => pinWeight(a) - pinWeight(b) || (a.name || "").localeCompare(b.name || ""),
      );
    case "most":
      return list.sort(
        (a, b) => pinWeight(a) - pinWeight(b) || totalViewTime(b) - totalViewTime(a),
      );
    case "month":
      return list.sort(
        (a, b) =>
          pinWeight(a) - pinWeight(b) ||
          totalViewTimeInWindow(b) - totalViewTimeInWindow(a),
      );
    case "least":
      return list.sort(
        (a, b) => pinWeight(a) - pinWeight(b) || totalVisits(a) - totalVisits(b),
      );
    case "recent":
      return list.sort(
        (a, b) =>
          pinWeight(a) - pinWeight(b) || (lastViewed(b) || 0) - (lastViewed(a) || 0),
      );
    case "updated":
    default:
      return list.sort(
        (a, b) => pinWeight(a) - pinWeight(b) || (b.updatedAt || 0) - (a.updatedAt || 0),
      );
  }
}

const VIEW_HISTORY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function getDayStartMs(ts) {
  const day = new Date(ts);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
}

export function totalViewTime(profile) {
  return (profile.cams || []).reduce(
    (sum, cam) => sum + (cam.viewMs || 0),
    0,
  );
}

export function totalViewTimeInWindow(profile, nowTs = Date.now()) {
  const cutoff = nowTs - VIEW_HISTORY_WINDOW_MS;
  const cutoffDayStart = getDayStartMs(cutoff);
  return (profile.cams || []).reduce((sum, cam) => {
    const history = Array.isArray(cam.viewHistory) ? cam.viewHistory : [];
    const viewTotal = history.reduce((historySum, entry) => {
      if (
        !entry ||
        typeof entry !== "object" ||
        !Number.isFinite(entry.durationMs)
      ) {
        return historySum;
      }
      const entryDayStart = Number.isFinite(entry.dayStart)
        ? entry.dayStart
        : Number.isFinite(entry.endedAt)
          ? getDayStartMs(entry.endedAt)
          : null;
      if (!Number.isFinite(entryDayStart) || entryDayStart < cutoffDayStart) {
        return historySum;
      }
      return historySum + entry.durationMs;
    }, 0);
    return sum + viewTotal;
  }, 0);
}

export function lastViewed(profile) {
  return (profile.cams || []).reduce((max, cam) => {
    const ts = cam.lastViewedAt || 0;
    return ts > max ? ts : max;
  }, 0);
}
