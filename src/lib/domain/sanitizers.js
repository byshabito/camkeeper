/*
 * CamKeeper - Cross-site model profile and bookmark manager
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

import SITES from "./sites.js";
import { normalizeText } from "./text.js";
import { parseSocialUrl } from "./urls.js";

const MAX_VIEW_HISTORY_DAYS = 200;

function uniqBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sanitizeViewHistory(viewHistory) {
  const cleaned = (viewHistory || [])
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => {
      const dayStart = Number.isFinite(entry.dayStart)
        ? entry.dayStart
        : Number.isFinite(entry.endedAt)
          ? (() => {
              const day = new Date(entry.endedAt);
              day.setHours(0, 0, 0, 0);
              return day.getTime();
            })()
          : null;
      const durationMs = Number.isFinite(entry.durationMs) ? entry.durationMs : null;
      if (!Number.isFinite(dayStart) || !Number.isFinite(durationMs) || durationMs <= 0) {
        return null;
      }
      return { dayStart, durationMs };
    })
    .filter(Boolean);

  const grouped = new Map();
  cleaned.forEach((entry) => {
    const existing = grouped.get(entry.dayStart);
    if (!existing) {
      grouped.set(entry.dayStart, { ...entry });
      return;
    }
    grouped.set(entry.dayStart, {
      dayStart: entry.dayStart,
      durationMs: existing.durationMs + entry.durationMs,
    });
  });

  const normalized = Array.from(grouped.values()).sort((a, b) => a.dayStart - b.dayStart);
  if (normalized.length > MAX_VIEW_HISTORY_DAYS) {
    return normalized.slice(normalized.length - MAX_VIEW_HISTORY_DAYS);
  }

  return normalized;
}

export function sanitizeCams(cams) {
  const cleaned = (cams || [])
    .map((cam) => ({
      site: normalizeText(cam.site),
      username: normalizeText(cam.username),
      viewMs: Number.isFinite(cam.viewMs)
        ? cam.viewMs
        : Number.isFinite(cam.activeMs)
          ? cam.activeMs
          : 0,
      lastViewedAt: Number.isFinite(cam.lastViewedAt)
        ? cam.lastViewedAt
        : Number.isFinite(cam.lastVisitedAt)
          ? cam.lastVisitedAt
          : null,
      viewHistory: sanitizeViewHistory(cam.viewHistory),
    }))
    .filter((cam) => cam.site && cam.username && SITES[cam.site]);

  const merged = new Map();
  cleaned.forEach((cam) => {
    const key = `${cam.site}:${cam.username}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...cam });
      return;
    }
    const mergedHistory = sanitizeViewHistory([
      ...(existing.viewHistory || []),
      ...(cam.viewHistory || []),
    ]);
    merged.set(key, {
      ...existing,
      viewMs: (existing.viewMs || 0) + (cam.viewMs || 0),
      lastViewedAt: Math.max(existing.lastViewedAt || 0, cam.lastViewedAt || 0) || null,
      viewHistory: mergedHistory,
    });
  });

  return Array.from(merged.values());
}

export function sanitizeSocials(socials) {
  const cleaned = (socials || [])
    .map((social) => ({
      platform: normalizeText(social.platform),
      handle: normalizeText(social.handle),
    }))
    .filter((social) => social.platform && social.handle);

  const normalized = cleaned.map((social) => {
    const trimmed = (social.handle || "").trim();
    if (!trimmed) return social;
    if (/^https?:\/\//i.test(trimmed)) {
      const parsed = parseSocialUrl(trimmed);
      if (parsed && parsed.platform === social.platform) {
        return { ...social, handle: normalizeText(parsed.handle) };
      }
    }
    const handle = trimmed.replace(/^@/, "").replace(/\/+$/, "");
    return { ...social, handle: normalizeText(handle) };
  });

  return uniqBy(normalized, (social) => `${social.platform}:${normalizeText(social.handle)}`);
}

export function sanitizeProfile(raw) {
  const cams = sanitizeCams(raw.cams || raw.platforms || raw.sites || []);
  const socials = sanitizeSocials(raw.socials || []);
  const tags = Array.isArray(raw.tags)
    ? raw.tags.map((tag) => (tag || "").trim()).filter(Boolean)
    : [];
  const name = (raw.name || "").trim() || (cams[0] ? cams[0].username : "");
  const pinned = Boolean(raw.pinned);
  const folder = (raw.folder || "").trim();
  return {
    id: raw.id,
    name,
    cams,
    socials,
    tags: uniqBy(tags, (tag) => normalizeText(tag)),
    folder,
    notes: (raw.notes || "").trim(),
    pinned,
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : null,
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : null,
  };
}

export function migrateLegacyCams(cams) {
  return (cams || []).map((cam) =>
    sanitizeProfile({
      name: cam.name,
      cams: (cam.site || []).map(([site, username]) => ({ site, username })),
      tags: cam.tags,
      notes: "",
      socials: [],
      createdAt: null,
      updatedAt: null,
    }),
  );
}
