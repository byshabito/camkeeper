export function normalizeText(value) {
  return (value || "").trim().toLowerCase();
}

export function splitTags(value) {
  return (value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}
