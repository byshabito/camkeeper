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

export function totalViewTime(profile) {
  return (profile.cams || []).reduce(
    (sum, cam) => sum + (cam.viewMs || 0),
    0,
  );
}

export function lastViewed(profile) {
  return (profile.cams || []).reduce((max, cam) => {
    const ts = cam.lastViewedAt || 0;
    return ts > max ? ts : max;
  }, 0);
}
