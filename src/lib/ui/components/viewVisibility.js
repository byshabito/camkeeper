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

export function setViewVisibility(views, activeView) {
  const { listView, formView, detailView, folderView, settingsView } = views;
  if (listView) listView.classList.toggle("hidden", activeView !== "list");
  if (formView) formView.classList.toggle("hidden", activeView !== "form");
  if (detailView) detailView.classList.toggle("hidden", activeView !== "detail");
  if (folderView) folderView.classList.toggle("hidden", activeView !== "folder");
  if (settingsView) settingsView.classList.toggle("hidden", activeView !== "settings");
}

export function setSettingsToggleState(
  { settingsToggle, settingsIcon, overviewIcon, isEmbedded },
  mode,
) {
  if (!settingsToggle) return;
  const shouldHide = mode === "hidden" || isEmbedded;
  settingsToggle.classList.toggle("hidden", shouldHide);
  if (shouldHide) return;
  if (settingsIcon) settingsIcon.classList.toggle("hidden", mode !== "settings");
  if (overviewIcon) overviewIcon.classList.toggle("hidden", mode !== "overview");
  const label = mode === "overview" ? "Overview" : "Settings page";
  settingsToggle.setAttribute("aria-label", label);
  settingsToggle.setAttribute("title", label);
}
