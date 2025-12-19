const SITES = {
  "chaturbate.com": { abbr: "CB", color: "blue" },
  "stripchat.com": { abbr: "SC", color: "red" },
};

const viewList = document.getElementById("view-list");
const viewForm = document.getElementById("view-form");
const form = document.getElementById("view-form");
const formSelector = document.getElementById("selector");
let editing = null;

function parseUrl(u) {
  const res = URL.parse(u);
  let site = res.host;
  let username = res.pathname.split("/")[1];

  if (!username || !site) {
    return null;
  }

  site = site.toLowerCase();
  username = username.toLowerCase();

  return Object.keys(SITES).includes(site)
    ? {
        site,
        username,
      }
    : null;
}

async function populateFormFromTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const u = parseUrl(tab.url);
  if (u) {
    renderSelector([[u.site, u.username]]);
  } else {
    renderSelector([]);
  }
}

function renderSelector(sites) {
  formSelector.innerHTML = "";

  console.log(sites);
  if (sites.length == 0) sites = [["chaturbate.com", ""]];

  sites.forEach((s, idx) => {
    const site = s[0];
    const username = s[1];

    const selector = document.createElement("select");
    selector.id = `site-${idx}`;
    Object.entries(SITES).forEach((s) => {
      const option = document.createElement("option");
      option.value = s[0];
      option.text = s[1].abbr;
      selector.appendChild(option);
    });
    selector.value = site;
    selector.onchange = () => (sites[idx][0] = selector.value);

    formSelector.appendChild(selector);

    const input = document.createElement("input");
    input.id = `username-${idx}`;
    input.placeholder = "Username";
    input.value = username;
    input.oninput = () => (sites[idx][1] = input.value);

    formSelector.appendChild(input);

    const button = document.createElement("button");
    button.id = `btn-del-${idx}`;
    button.innerText = "-";
    button.onclick = () => {
      sites.splice(idx, 1);
      renderSelector(sites);
    };
    formSelector.appendChild(button);
  });

  const btn = document.createElement("button");
  btn.innerText = "+";
  btn.onclick = () => renderSelector([...sites, ["chaturbate.com", ""]]);
  formSelector.appendChild(btn);
}

function render() {
  chrome.storage.local.get("cams", ({ cams = [] }) => {
    list.innerHTML = "";
    cams.forEach((c, idx) => {
      const sites = c.site
        .map((s) => {
          const [site, username] = s;
          return `<a href="https://${site}/${username}" target="_blank" style="color: ${SITES[site].color}; text-decoration: none;" title="${username}" >${SITES[site].abbr}</a>`;
        })
        .join(" ");

      const tags = c.tags.map((tag) => `<span>${tag}</span>`).join("");

      const li = document.createElement("li");
      li.classList = "list-item";
      li.innerHTML = `
        <div class="info">
        <span class="head">
        <span class="name">${c.name}</span> ${sites}</span>
        <span class="tags">${tags}</span>
        </div>
        <div class="buttons">
        <button data-edit="${idx}">Edit</button>
        <button data-del="${idx}">Delete</button></div>`;
      list.appendChild(li);
    });
  });
}

function showList() {
  viewList.classList.remove("hidden");
  viewForm.classList.add("hidden");
  render();
}

function showForm() {
  viewList.classList.add("hidden");
  viewForm.classList.remove("hidden");
}

document.getElementById("btn-add").onclick = async () => {
  await populateFormFromTab();
  showForm();
};

document.getElementById("btn-cancel").onclick = showList;

form.addEventListener("submit", (e) => {
  e.preventDefault();

  let hasSite = true;
  let i = 0;
  let sites = [];
  while (hasSite) {
    try {
      sites.push([form[`site-${i}`].value, form[`username-${i}`].value]);
    } catch (e) {
      hasSite = false;
    } finally {
      i++;
    }
  }

  const entry = {
    site: sites,
    name: form.name.value?.trim() ?? form.username.value,
    tags: form.tags.value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  };

  chrome.storage.local.get("cams", ({ cams = [] }) => {
    if (editing !== null) cams[editing] = entry;
    else cams.push(entry);
    chrome.storage.local.set({ cams }, () => {
      form.reset();
      editing = null;
    });
    render();
  });
  showList();
});

list.addEventListener("click", (e) => {
  const idx = e.target.dataset.edit ?? e.target.dataset.del;
  if (idx == null) return;
  chrome.storage.local.get("cams", async ({ cams = [] }) => {
    const cam = cams[idx];
    if (e.target.dataset.edit != null) {
      editing = idx;
      renderSelector(cam.site);
      form.name.value = cam.name;
      form.tags.value = cam.tags.join(", ");
      showForm();
    } else if (e.target.dataset.del != null) {
      cams.splice(+idx, 1);
      chrome.storage.local.set({ cams }, render);
    }
  });
});

showList();
