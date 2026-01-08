import SITES from "../config/sites.js";

export const STORAGE_KEY = "camkeeper_profiles_v1";
const LEGACY_KEYS = ["profiles", "cams"];

export const SOCIAL_OPTIONS = [
  { id: "instagram", label: "Instagram" },
  { id: "x", label: "X" },
  { id: "onlyfans", label: "OnlyFans" },
  { id: "tiktok", label: "TikTok" },
  { id: "reddit", label: "Reddit" },
  { id: "website", label: "Website" },
  { id: "other", label: "Other" },
];

const storage = chrome.storage.local;

function now() {
  return Date.now();
}

export function createId() {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeText(value) {
  return (value || "").trim().toLowerCase();
}

export function splitTags(value) {
  return (value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function uniqBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function sanitizePlatforms(platforms) {
  const cleaned = (platforms || [])
    .map((platform) => ({
      site: normalizeText(platform.site),
      username: normalizeText(platform.username),
      online: Boolean(platform.online),
      visitCount: Number.isFinite(platform.visitCount) ? platform.visitCount : 0,
      lastVisitedAt: Number.isFinite(platform.lastVisitedAt)
        ? platform.lastVisitedAt
        : null,
      lastLeftAt: Number.isFinite(platform.lastLeftAt) ? platform.lastLeftAt : null,
    }))
    .filter((platform) => platform.site && platform.username && SITES[platform.site]);

  const merged = new Map();
  cleaned.forEach((platform) => {
    const key = `${platform.site}:${platform.username}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...platform });
      return;
    }
    merged.set(key, {
      ...existing,
      visitCount: (existing.visitCount || 0) + (platform.visitCount || 0),
      lastVisitedAt: Math.max(existing.lastVisitedAt || 0, platform.lastVisitedAt || 0) || null,
      lastLeftAt: Math.max(existing.lastLeftAt || 0, platform.lastLeftAt || 0) || null,
      online: Boolean(existing.online || platform.online),
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

  return uniqBy(cleaned, (social) => `${social.platform}:${normalizeText(social.handle)}`);
}

export function sanitizeProfile(raw) {
  const platforms = sanitizePlatforms(raw.platforms || raw.sites || []);
  const socials = sanitizeSocials(raw.socials || []);
  const tags = Array.isArray(raw.tags)
    ? raw.tags.map((tag) => (tag || "").trim()).filter(Boolean)
    : [];
  const name = (raw.name || "").trim() || (platforms[0] ? platforms[0].username : "");
  const pinned = Boolean(raw.pinned);

  return {
    id: raw.id || createId(),
    name,
    platforms,
    socials,
    tags: uniqBy(tags, (tag) => normalizeText(tag)),
    notes: (raw.notes || "").trim(),
    pinned,
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : now(),
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : now(),
  };
}

export function sortProfiles(profiles) {
  return profiles
    .slice()
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function matchQuery(profile, query) {
  if (!query) return true;
  const q = normalizeText(query);
  const fields = [
    profile.name,
    profile.notes,
    ...(profile.tags || []),
    ...(profile.platforms || []).flatMap((platform) => [platform.site, platform.username]),
    ...(profile.socials || []).flatMap((social) => [social.platform, social.handle]),
  ];
  return fields
    .filter(Boolean)
    .some((field) => normalizeText(field).includes(q));
}

export function findDuplicateProfile(profiles, profile, ignoreId) {
  const targets = sanitizePlatforms(profile.platforms || []);
  return profiles.find((candidate) => {
    if (candidate.id === ignoreId) return false;
    return (candidate.platforms || []).some((platform) =>
      targets.some(
        (target) =>
          normalizeText(target.site) === normalizeText(platform.site) &&
          normalizeText(target.username) === normalizeText(platform.username),
      ),
    );
  });
}

function mergeNotes(existing, incoming) {
  if (existing && incoming && existing !== incoming) {
    return `${existing}
${incoming}`.trim();
  }
  return incoming || existing || "";
}

export function mergeProfiles(base, incoming) {
  const merged = {
    ...base,
    name: incoming.name || base.name,
    notes: mergeNotes(base.notes, incoming.notes),
    tags: uniqBy([...(base.tags || []), ...(incoming.tags || [])], (tag) => normalizeText(tag)),
    platforms: sanitizePlatforms([...(base.platforms || []), ...(incoming.platforms || [])]),
    socials: sanitizeSocials([...(base.socials || []), ...(incoming.socials || [])]),
    pinned: Boolean(base.pinned || incoming.pinned),
    updatedAt: now(),
  };

  return sanitizeProfile(merged);
}

function migrateLegacyCams(cams) {
  return (cams || []).map((cam) =>
    sanitizeProfile({
      name: cam.name,
      platforms: (cam.site || []).map(([site, username]) => ({ site, username })),
      tags: cam.tags,
      notes: "",
      socials: [],
      createdAt: now(),
      updatedAt: now(),
    }),
  );
}

export async function loadProfiles() {
  const data = await new Promise((resolve) => {
    storage.get([STORAGE_KEY, ...LEGACY_KEYS], (res) => resolve(res));
  });

  let profiles = Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
  let shouldPersist = false;

  if (!profiles.length) {
    if (Array.isArray(data.profiles) && data.profiles.length) {
      profiles = data.profiles;
      shouldPersist = true;
    } else if (Array.isArray(data.cams) && data.cams.length) {
      profiles = migrateLegacyCams(data.cams);
      shouldPersist = true;
    }
  }

  profiles = (profiles || []).map((profile) => sanitizeProfile(profile));

  if (profiles.length && shouldPersist) {
    await saveProfiles(profiles);
  }

  return profiles;
}

export async function saveProfiles(profiles) {
  const cleaned = (profiles || []).map((profile) => sanitizeProfile(profile));
  await new Promise((resolve) => storage.set({ [STORAGE_KEY]: cleaned }, resolve));
  return cleaned;
}
