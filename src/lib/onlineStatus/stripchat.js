const STRIPCHAT_API_BASE = "https://stripchat.com/api/front/v1/broadcasts";

async function fetchStripchatStatus(username) {
  const url = `${STRIPCHAT_API_BASE}/${encodeURIComponent(username)}`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      console.warn("[CamKeeper] Stripchat fetch failed", username, response.status);
      return null;
    }
    const data = await response.json();
    if (typeof data?.item?.isLive === "boolean") {
      return data.item.isLive;
    }
    // Treat missing status info as offline so stale online flags clear.
    return false;
  } catch (error) {
    console.warn("[CamKeeper] Stripchat fetch failed", username, error);
    return null;
  }
}

export async function fetchOnlineStatuses(usernames) {
  const unique = Array.from(new Set(usernames));
  if (!unique.length) return new Map();

  const concurrency = 5;
  const results = new Map();
  let index = 0;

  const worker = async () => {
    while (index < unique.length) {
      const current = unique[index];
      index += 1;
      const status = await fetchStripchatStatus(current);
      if (status === null) continue;
      results.set(current, status);
    }
  };

  await Promise.all(Array.from({ length: concurrency }, worker));
  console.log("[CamKeeper] Stripchat status fetched", {
    checked: unique.length,
    results: results.size,
  });
  return results;
}
