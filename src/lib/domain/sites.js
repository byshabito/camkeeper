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

const DEFAULT_SITE_COLOR = "#64748b";
const DEFAULT_LIVESTREAM_SITE_HOSTS = ["twitch.tv", "youtube.com"];
const KNOWN_SITE_METADATA = {
  "twitch.tv": {
    label: "Twitch",
    abbr: "TW",
    color: "#9146ff",
  },
  "youtube.com": {
    label: "YouTube",
    abbr: "YT",
    color: "#ff0000",
  },
};

export function normalizeHost(hostname) {
  let host = (hostname || "").toLowerCase();
  let prev;
  do {
    prev = host;
    host = host.replace(/^(www\.|m\.|mobile\.|amp\.)/, "");
  } while (host !== prev);
  return host;
}

function buildLabel(host) {
  if (!host) return "";
  const leading = host.split(".").filter(Boolean)[0] || host;
  return leading.charAt(0).toUpperCase() + leading.slice(1);
}

function buildAbbr(label, host) {
  const source = (label || host || "").trim();
  if (!source) return "";
  const parts = source.split(/[^a-z0-9]+/i).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function normalizeLivestreamHost(value) {
  if (!value || typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return normalizeHost(url.hostname);
  } catch (error) {
    return normalizeHost(trimmed.replace(/\/.*$/, ""));
  }
}

export function normalizeLivestreamSites(rawSites) {
  if (!Array.isArray(rawSites)) return DEFAULT_LIVESTREAM_SITE_HOSTS.slice();
  const normalized = rawSites
    .map((entry) => {
      if (typeof entry === "string") return normalizeLivestreamHost(entry);
      if (entry && typeof entry === "object") {
        return normalizeLivestreamHost(entry.host || entry.hostname || "");
      }
      return "";
    })
    .filter(Boolean);
  return normalized.length ? Array.from(new Set(normalized)) : DEFAULT_LIVESTREAM_SITE_HOSTS.slice();
}

export function isYouTubeHost(host) {
  return host === "youtube.com" || host.endsWith(".youtube.com");
}

function buildProfileUrl(host, username) {
  const handle = (username || "").trim();
  if (!host || !handle) return "";
  if (isYouTubeHost(host)) {
    if (handle.startsWith("@") || handle.includes("/")) {
      return `https://www.youtube.com/${handle}`;
    }
    return `https://www.youtube.com/@${handle}`;
  }
  return `https://${host}/${handle}`;
}

export function buildSites(siteHosts) {
  const hosts = normalizeLivestreamSites(siteHosts);
  return hosts.reduce((acc, host) => {
    const metadata = KNOWN_SITE_METADATA[host] || {};
    const label = metadata.label || buildLabel(host);
    const abbr = metadata.abbr || buildAbbr(label, host);
    const color = metadata.color || DEFAULT_SITE_COLOR;
    acc[host] = {
      host,
      label,
      abbr,
      color,
      url: (username) => buildProfileUrl(host, username),
    };
    return acc;
  }, {});
}

let sites = buildSites(DEFAULT_LIVESTREAM_SITE_HOSTS);

export function setSitesFromSettings(siteHosts) {
  sites = buildSites(siteHosts);
  return sites;
}

export function getSites() {
  return sites;
}

export function getSiteKeys() {
  return Object.keys(sites);
}

export const DEFAULT_LIVESTREAM_SITES = DEFAULT_LIVESTREAM_SITE_HOSTS.slice();
