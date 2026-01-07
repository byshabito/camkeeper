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
