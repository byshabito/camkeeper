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

export function clearContainer(container) {
  if (!container) return;
  while (container.firstChild) container.removeChild(container.firstChild);
}

function createSvgElement(svgString) {
  if (!svgString) return null;
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");
  const svg = doc.documentElement;
  if (!svg || svg.nodeName === "parsererror") return null;
  return document.importNode(svg, true);
}

export function applySvg(container, svgString) {
  const svg = createSvgElement(svgString);
  if (!svg) return false;
  container.appendChild(svg);
  return true;
}
