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
        (a, b) => pinWeight(a) - pinWeight(b) || totalVisits(b) - totalVisits(a),
      );
    case "least":
      return list.sort(
        (a, b) => pinWeight(a) - pinWeight(b) || totalVisits(a) - totalVisits(b),
      );
    case "recent":
      return list.sort(
        (a, b) => pinWeight(a) - pinWeight(b) || (lastVisited(b) || 0) - (lastVisited(a) || 0),
      );
    case "updated":
    default:
      return list.sort(
        (a, b) => pinWeight(a) - pinWeight(b) || (b.updatedAt || 0) - (a.updatedAt || 0),
      );
  }
}

export function totalVisits(profile) {
  return (profile.platforms || []).reduce(
    (sum, platform) => sum + (platform.visitCount || 0),
    0,
  );
}

export function lastVisited(profile) {
  return (profile.platforms || []).reduce((max, platform) => {
    const ts = platform.lastVisitedAt || 0;
    return ts > max ? ts : max;
  }, 0);
}
