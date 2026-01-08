const CHATURBATE_API_URL =
  "https://chaturbate.com/affiliates/api/onlinerooms/?format=json&wm=SBlL1";

async function fetchChaturbateOnlineSet() {
  try {
    const response = await fetch(CHATURBATE_API_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      console.warn("[CamKeeper] Online check fetch failed", response.status);
      return null;
    }
    const data = await response.json();
    const online = new Set();
    let foundList = false;

    const collect = (list) => {
      if (!list) return;
      foundList = true;
      if (Array.isArray(list)) {
        list.forEach((item) => {
          if (typeof item === "string") {
            online.add(item.toLowerCase());
            return;
          }
          const name =
            item?.username ||
            item?.room_name ||
            item?.roomName ||
            item?.roomname ||
            item?.name;
          if (name) online.add(String(name).toLowerCase());
        });
        return;
      }
      if (typeof list === "object") {
        Object.keys(list).forEach((key) => {
          online.add(key.toLowerCase());
        });
      }
    };

    if (Array.isArray(data)) {
      collect(data);
    } else {
      collect(data?.rooms);
      collect(data?.roomlist);
      collect(data?.results);
      collect(data?.data);
    }

    if (!foundList) {
      console.warn("[CamKeeper] Online check response missing list");
      return null;
    }
    console.log("[CamKeeper] Online check fetched", { count: online.size });
    return online;
  } catch (error) {
    console.warn("[CamKeeper] Online check failed", error);
    return null;
  }
}

export async function fetchOnlineStatuses(usernames) {
  const unique = Array.from(new Set(usernames));
  if (!unique.length) return new Map();
  const online = await fetchChaturbateOnlineSet();
  if (!online) return new Map();
  const results = new Map();
  unique.forEach((username) => {
    results.set(username, online.has(username));
  });
  return results;
}
