import { createId } from "./ids.js";
import { normalizeText } from "./text.js";
import { sanitizeCams, sanitizeProfile, sanitizeSocials } from "./sanitizers.js";

function uniqBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeNotes(existing, incoming) {
  if (existing && incoming && existing !== incoming) {
    return `${existing}
${incoming}`.trim();
  }
  return incoming || existing || "";
}

export function matchQuery(profile, query) {
  if (!query) return true;
  const q = normalizeText(query);
  const fields = [
    profile.name,
    profile.folder,
    profile.notes,
    ...(profile.tags || []),
    ...(profile.cams || []).flatMap((cam) => [cam.site, cam.username]),
    ...(profile.socials || []).flatMap((social) => [social.platform, social.handle]),
  ];
  return fields
    .filter(Boolean)
    .some((field) => normalizeText(field).includes(q));
}

export function findDuplicateProfile(profiles, profile, ignoreId) {
  const targets = sanitizeCams(profile.cams || []);
  return profiles.find((candidate) => {
    if (candidate.id === ignoreId) return false;
    return (candidate.cams || []).some((cam) =>
      targets.some(
        (target) =>
          normalizeText(target.site) === normalizeText(cam.site) &&
          normalizeText(target.username) === normalizeText(cam.username),
      ),
    );
  });
}

export function mergeProfiles(base, incoming) {
  const merged = {
    ...base,
    id: incoming.id || base.id || createId(),
    name: incoming.name || base.name,
    folder: incoming.folder || base.folder,
    notes: mergeNotes(base.notes, incoming.notes),
    tags: uniqBy([...(base.tags || []), ...(incoming.tags || [])], (tag) => normalizeText(tag)),
    cams: sanitizeCams([...(base.cams || []), ...(incoming.cams || [])]),
    socials: sanitizeSocials([...(base.socials || []), ...(incoming.socials || [])]),
    pinned: Boolean(base.pinned || incoming.pinned),
    updatedAt: Date.now(),
  };

  return sanitizeProfile(merged);
}
