import SITES from "../../config/sites.js";

function normalizeHost(hostname) {
  return hostname.replace(/^www\./, "").toLowerCase();
}

export function parseUrl(u) {
  try {
    const url = new URL(u);
    const host = normalizeHost(url.hostname);
    if (!Object.keys(SITES).includes(host)) return null;

    let username = "";
    if (host === "chaturbate.com") {
      if (url.pathname.startsWith("/in/")) {
        username = url.searchParams.get("room") || "";
      }
      if (!username) {
        const parts = url.pathname.split("/").filter(Boolean);
        username = parts[0] || "";
      }
    } else {
      const parts = url.pathname.split("/").filter(Boolean);
      username = parts[0] || "";
    }

    username = username.trim().toLowerCase();
    if (!username) return null;

    return {
      site: host,
      username,
    };
  } catch (e) {
    return null;
  }
}
