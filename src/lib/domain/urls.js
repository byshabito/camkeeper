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

import { getSites, isYouTubeHost, normalizeHost } from "./sites.js";
import { normalizeText } from "./text.js";

function normalizeWebsiteHandleFromUrl(url) {
  if (!url || !url.hostname) return "";
  const host = normalizeHost(url.hostname);
  const path = url.pathname.replace(/\/+$/, "");
  if (path && path !== "/") return `${host}${path}`;
  return host;
}

export function normalizeWebsiteHandle(value) {
  if (!value) return "";
  if (value instanceof URL) {
    return normalizeWebsiteHandleFromUrl(value).toLowerCase();
  }
  try {
    const url = new URL(value);
    if (!/^https?:$/i.test(url.protocol)) return "";
    return normalizeWebsiteHandleFromUrl(url).toLowerCase();
  } catch (error) {
    return value
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .replace(/\/+$/, "")
      .toLowerCase();
  }
}

export function parseUrl(u, sites = getSites()) {
  try {
    const url = new URL(u);
    const host = normalizeHost(url.hostname);
    const siteKey = Object.keys(sites).find(
      (key) => host === key || host.endsWith(`.${key}`),
    );
    if (!siteKey) return null;

    let username = "";
    const parts = url.pathname.split("/").filter(Boolean);
    if (isYouTubeHost(siteKey)) {
      const first = parts[0] || "";
      if (first.startsWith("@")) {
        username = first.slice(1);
      } else if (["channel", "c", "user"].includes(first) && parts[1]) {
        username = `${first}/${parts[1]}`;
      } else {
        username = first;
      }
    } else {
      username = parts[0] || "";
    }

    username = username.trim().toLowerCase();
    if (!username) return null;

    return {
      site: siteKey,
      username,
    };
  } catch (e) {
    return null;
  }
}

export function parseSocialUrl(u) {
  try {
    const url = new URL(u);
    if (!/^https?:$/i.test(url.protocol)) return null;
    const host = normalizeHost(url.hostname);
    const path = url.pathname
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean)
      .map((segment) => {
        try {
          return decodeURIComponent(segment);
        } catch (error) {
          return segment;
        }
      });

    if (host === "instagram.com") {
      const first = path[0] || "";
      if (["p", "reel", "tv", "explore", "accounts", "tags"].includes(first)) return null;
      const handle = first === "stories" ? path[1] || "" : first;
      return handle ? { platform: "instagram", handle: handle.toLowerCase() } : null;
    }

    if (host === "threads.net") {
      const first = path[0] || "";
      if (!first.startsWith("@")) return null;
      const handle = first.replace(/^@/, "");
      return handle ? { platform: "threads", handle: handle.toLowerCase() } : null;
    }

    if (host === "t.me" || host === "telegram.me") {
      const first = path[0] || "";
      const handle = first === "s" ? path[1] || "" : first;
      return handle ? { platform: "telegram", handle: handle.toLowerCase() } : null;
    }

    if (host === "x.com" || host === "twitter.com") {
      const first = path[0] || "";
      const blocked = [
        "home",
        "explore",
        "notifications",
        "messages",
        "i",
        "settings",
        "login",
        "logout",
        "search",
        "compose",
        "intent",
      ];
      if (!first || blocked.includes(first)) return null;
      const handle = first;
      return handle ? { platform: "x", handle: handle.toLowerCase() } : null;
    }

    if (host.endsWith("youtube.com")) {
      const first = path[0] || "";
      if (first.startsWith("@")) {
        return { platform: "youtube", handle: first.slice(1).toLowerCase() };
      }
      if (["c", "channel", "user"].includes(first) && path[1]) {
        return { platform: "youtube", handle: path[1].toLowerCase() };
      }
      return null;
    }

    if (host === "tiktok.com") {
      const candidate =
        path.find((segment) => segment.startsWith("@")) ||
        "";
      const handle = candidate.replace(/^@/, "");
      return handle ? { platform: "tiktok", handle: handle.toLowerCase() } : null;
    }

    const websiteHandle = normalizeWebsiteHandleFromUrl(url);
    return websiteHandle ? { platform: "website", handle: websiteHandle.toLowerCase() } : null;
  } catch (error) {
    return null;
  }
}

export function buildSocialUrl(social) {
  const handle = (social?.handle || "").trim();
  if (!handle) return null;

  if (/^https?:\/\//i.test(handle)) return handle;

  const normalized = handle.replace(/^@/, "");
  const platform = normalizeText(social?.platform);

  switch (platform) {
    case "instagram":
      return `https://instagram.com/${normalized}`;
    case "threads":
      return `https://www.threads.net/@${normalized}`;
    case "telegram":
      return `https://t.me/${normalized}`;
    case "youtube":
      return `https://www.youtube.com/@${normalized}`;
    case "x":
      return `https://x.com/${normalized}`;
    case "tiktok":
      return `https://www.tiktok.com/@${normalized}`;
    case "website":
    case "other":
      return `https://${handle}`;
    default:
      return null;
  }
}

export function parseCamInput(value, sites = getSites()) {
  const raw = (value || "").trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) {
    return parseUrl(raw, sites);
  }

  return { site: null, username: raw.replace(/^@/, "").toLowerCase() };
}

export function parseSocialInput(value) {
  const raw = (value || "").trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) {
    const parsed = parseSocialUrl(raw);
    if (parsed) return parsed;
    return { platform: "website", handle: raw.toLowerCase() };
  }

  return { platform: null, handle: raw.replace(/^@/, "").toLowerCase() };
}
