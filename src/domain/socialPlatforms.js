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

import { normalizeText } from "./text.js";

export const SUPPORTED_SOCIAL_PLATFORM_IDS = [
  "x",
  "instagram",
  "threads",
  "tiktok",
  "telegram",
  "youtube",
  "website",
];

const SUPPORTED_SOCIAL_PLATFORM_SET = new Set(SUPPORTED_SOCIAL_PLATFORM_IDS);

export function normalizeSocialPlatform(platform) {
  const normalized = normalizeText(platform);
  if (!normalized) return "";
  if (normalized === "other") return "website";
  if (SUPPORTED_SOCIAL_PLATFORM_SET.has(normalized)) return normalized;
  return "website";
}
