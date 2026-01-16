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

export function initConfirmModal() {
  const modal = document.getElementById("confirm-modal");
  const title = document.getElementById("confirm-title");
  const message = document.getElementById("confirm-message");
  const list = document.getElementById("confirm-list");
  const cancel = document.getElementById("confirm-cancel");
  const accept = document.getElementById("confirm-accept");

  if (!modal || !title || !message || !list || !cancel || !accept) {
    return () => Promise.resolve(false);
  }

  return ({ titleText, messageText, items = [], confirmLabel = "Delete" }) =>
    new Promise((resolve) => {
      title.textContent = titleText;
      message.textContent = messageText;
      accept.textContent = confirmLabel;
      list.innerHTML = "";
      if (items.length) {
        items.forEach((item) => {
          const li = document.createElement("li");
          li.textContent = item;
          list.appendChild(li);
        });
      }
      modal.classList.remove("hidden");

      const cleanup = (result) => {
        modal.classList.add("hidden");
        cancel.onclick = null;
        accept.onclick = null;
        resolve(result);
      };

      cancel.onclick = () => cleanup(false);
      accept.onclick = () => cleanup(true);
    });
}
