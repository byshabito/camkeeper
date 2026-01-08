const MENU_ID = "camkeeper-open-library";
const STORAGE_KEY = "camkeeper_profiles_v1";
const SETTINGS_KEY = "camkeeper_settings_v1";
const DEFAULT_VISIT_DELAY_MS = 20 * 1000;
const DEFAULT_VISIT_COOLDOWN_MS = 10 * 60 * 1000;
const ONLINE_CHECK_ALARM = "camkeeper-online-check";
const ONLINE_CHECK_INTERVAL_MINUTES = 3;
const CHATURBATE_API_URL =
  "https://chaturbate.com/affiliates/api/onlinerooms/?format=json&wm=SBlL1";
const pendingTimers = new Map();
const lastLoaded = new Map();
let activeTabId = null;
let settings = {
  visitDelayMs: DEFAULT_VISIT_DELAY_MS,
  visitCooldownMs: DEFAULT_VISIT_COOLDOWN_MS,
};

function loadSettings() {
  chrome.storage.local.get(SETTINGS_KEY, (res) => {
    const data = res[SETTINGS_KEY] || {};
    settings = {
      visitDelayMs: Number.isFinite(data.visitDelayMs)
        ? data.visitDelayMs
        : DEFAULT_VISIT_DELAY_MS,
      visitCooldownMs: Number.isFinite(data.visitCooldownMs)
        ? data.visitCooldownMs
        : DEFAULT_VISIT_COOLDOWN_MS,
    };
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[SETTINGS_KEY]) {
    loadSettings();
  }
});

loadSettings();

function ensureOnlineCheckAlarm() {
  chrome.alarms.get(ONLINE_CHECK_ALARM, (alarm) => {
    if (alarm) return;
    chrome.alarms.create(ONLINE_CHECK_ALARM, {
      periodInMinutes: ONLINE_CHECK_INTERVAL_MINUTES,
      delayInMinutes: 1,
    });
    console.log("[CamKeeper] Online check alarm scheduled", {
      minutes: ONLINE_CHECK_INTERVAL_MINUTES,
    });
  });
}

async function fetchChaturbateOnlineSet() {
  try {
    const response = await fetch(CHATURBATE_API_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      console.warn("[CamKeeper] Online check fetch failed", response.status);
      return null;
    }
    const data = await response.json();
    const online = new Set();
    let foundList = false;

    const collect = (list) => {
      if (!list) return;
      foundList = true;
      if (Array.isArray(list)) {
        list.forEach((item) => {
          if (typeof item === "string") {
            online.add(item.toLowerCase());
            return;
          }
          const name =
            item?.username ||
            item?.room_name ||
            item?.roomName ||
            item?.roomname ||
            item?.name;
          if (name) online.add(String(name).toLowerCase());
        });
        return;
      }
      if (typeof list === "object") {
        Object.keys(list).forEach((key) => {
          online.add(key.toLowerCase());
        });
      }
    };

    if (Array.isArray(data)) {
      collect(data);
    } else {
      collect(data?.rooms);
      collect(data?.roomlist);
      collect(data?.results);
      collect(data?.data);
    }

    if (!foundList) {
      console.warn("[CamKeeper] Online check response missing list");
      return null;
    }
    console.log("[CamKeeper] Online check fetched", { count: online.size });
    return online;
  } catch (error) {
    console.warn("[CamKeeper] Online check failed", error);
    return null;
  }
}

async function refreshOnlineStatus() {
  const online = await fetchChaturbateOnlineSet();
  if (!online) return;

  chrome.storage.local.get(STORAGE_KEY, (res) => {
    const profiles = Array.isArray(res[STORAGE_KEY]) ? res[STORAGE_KEY] : [];
    let changed = 0;
    const updated = profiles.map((profile) => {
      const platforms = (profile.platforms || []).map((platform) => {
        if (platform.site !== "chaturbate.com") return platform;
        const username = (platform.username || "").toLowerCase();
        const isOnline = online.has(username);
        if (platform.online === isOnline) return platform;
        changed += 1;
        return { ...platform, online: isOnline };
      });
      return { ...profile, platforms };
    });
    chrome.storage.local.set({ [STORAGE_KEY]: updated });
    console.log("[CamKeeper] Online status updated", {
      profiles: profiles.length,
      changed,
    });
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ONLINE_CHECK_ALARM) {
    console.log("[CamKeeper] Online check tick");
    refreshOnlineStatus();
  }
});

function openLibrary() {
  if (chrome.runtime?.openOptionsPage) {
    chrome.runtime.openOptionsPage();
    return;
  }
  const url = chrome.runtime.getURL("src/entries/options/index.html");
  chrome.tabs.create({ url });
}

chrome.runtime.onInstalled.addListener(() => {
  try {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: "Open CamKeeper Library",
      contexts: ["action", "browser_action"],
    });
  } catch (error) {
    // Ignore context menu creation errors in unsupported contexts.
  }
  ensureOnlineCheckAlarm();
});

chrome.runtime.onStartup?.addListener(() => {
  ensureOnlineCheckAlarm();
});

ensureOnlineCheckAlarm();

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== MENU_ID) return;
  openLibrary();
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "open-library") {
    openLibrary();
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  if (activeTabId && activeTabId !== tabId) {
    markLeft(activeTabId);
    clearVisitTimer(activeTabId);
  }
  activeTabId = tabId;
  chrome.tabs.get(tabId, (tab) => {
    if (!tab || !tab.url) return;
    const existing = lastLoaded.get(tabId);
    if (existing) {
      scheduleVisitCheck(tabId);
      return;
    }
    const parsed = parseUrlSafe(tab.url);
    if (parsed) {
      lastLoaded.set(tabId, { ...parsed, counted: false, recorded: false });
      scheduleVisitCheck(tabId);
    }
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== "complete") return;
  markLeft(tabId);
  clearVisitTimer(tabId);
  chrome.tabs.get(tabId, (tab) => {
    if (!tab || !tab.url) return;
    const parsed = parseUrlSafe(tab.url);
    if (!parsed) {
      lastLoaded.delete(tabId);
      return;
    }
    lastLoaded.set(tabId, { ...parsed, counted: false, recorded: false });
    if (tab.active) {
      scheduleVisitCheck(tabId);
    }
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  markLeft(tabId);
  clearVisitTimer(tabId);
  if (activeTabId === tabId) activeTabId = null;
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE && activeTabId) {
    markLeft(activeTabId);
    clearVisitTimer(activeTabId);
    return;
  }
  if (activeTabId && windowId !== chrome.windows.WINDOW_ID_NONE) {
    scheduleVisitCheck(activeTabId);
  }
});

function scheduleVisitCheck(tabId) {
  const loaded = lastLoaded.get(tabId);
  if (!loaded || loaded.counted) return;
  if (pendingTimers.has(tabId)) return;
  const timeoutId = setTimeout(() => recordVisit(tabId), settings.visitDelayMs);
  pendingTimers.set(tabId, timeoutId);
  console.log("[CamKeeper] Scheduled visit check", { tabId });
}

function clearVisitTimer(tabId) {
  const timeoutId = pendingTimers.get(tabId);
  if (timeoutId) {
    clearTimeout(timeoutId);
    pendingTimers.delete(tabId);
    console.log("[CamKeeper] Cleared visit timer", { tabId });
  }
}

function parseUrlSafe(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    let username = "";
    if (host === "chaturbate.com") {
      if (u.pathname.startsWith("/in/")) {
        username = u.searchParams.get("room") || "";
      }
      if (!username) {
        const parts = u.pathname.split("/").filter(Boolean);
        username = parts[0] || "";
      }
    } else if (host === "stripchat.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      username = parts[0] || "";
    } else {
      return null;
    }
    if (!username) return null;
    return { site: host, username: username.toLowerCase() };
  } catch (error) {
    return null;
  }
}

function recordVisit(tabId) {
  chrome.tabs.get(tabId, (tab) => {
    pendingTimers.delete(tabId);
    if (!tab || !tab.active || !tab.url) return;
    const parsed = parseUrlSafe(tab.url);
    const loaded = lastLoaded.get(tabId);
    if (!parsed || !loaded) {
      console.log("[CamKeeper] Visit skipped (missing parsed/loaded)", {
        tabId,
        parsed,
        loaded,
      });
      return;
    }
    if (loaded.counted) {
      console.log("[CamKeeper] Visit skipped (already counted)", {
        tabId,
        parsed,
      });
      return;
    }
    if (parsed.site !== loaded.site || parsed.username !== loaded.username) {
      console.log("[CamKeeper] Visit skipped (URL mismatch)", {
        tabId,
        parsed,
        loaded,
      });
      return;
    }
    loaded.counted = true;
    console.log("[CamKeeper] Recording visit", { tabId, parsed });

    chrome.storage.local.get(STORAGE_KEY, (res) => {
      const profiles = Array.isArray(res[STORAGE_KEY]) ? res[STORAGE_KEY] : [];
      let shouldCount = false;
      const updated = profiles.map((profile) => {
        const platforms = (profile.platforms || []).map((platform) => {
          if (
            platform.site === parsed.site &&
            platform.username === parsed.username
          ) {
            const lastLeftAt = Number.isFinite(platform.lastLeftAt)
              ? platform.lastLeftAt
              : 0;
            if (Date.now() - lastLeftAt < settings.visitCooldownMs) {
              console.log("[CamKeeper] Visit skipped (cooldown)", {
                tabId,
                site: parsed.site,
                username: parsed.username,
              });
              return platform;
            }
            shouldCount = true;
            const count = Number.isFinite(platform.visitCount)
              ? platform.visitCount
              : 0;
            return {
              ...platform,
              visitCount: count + 1,
              lastVisitedAt: Date.now(),
            };
          }
          return platform;
        });
        return { ...profile, platforms };
      });
      loaded.recorded = shouldCount;
      if (!shouldCount) return;
      chrome.storage.local.set({ [STORAGE_KEY]: updated });
      console.log("[CamKeeper] Visit saved", {
        tabId,
        site: parsed.site,
        username: parsed.username,
      });
    });
  });
}

function markLeft(tabId) {
  const loaded = lastLoaded.get(tabId);
  if (!loaded || !loaded.recorded) return;
  chrome.storage.local.get(STORAGE_KEY, (res) => {
    const profiles = Array.isArray(res[STORAGE_KEY]) ? res[STORAGE_KEY] : [];
    const updated = profiles.map((profile) => {
      const platforms = (profile.platforms || []).map((platform) => {
        if (
          platform.site === loaded.site &&
          platform.username === loaded.username
        ) {
          return {
            ...platform,
            lastLeftAt: Date.now(),
          };
        }
        return platform;
      });
      return { ...profile, platforms };
    });
    chrome.storage.local.set({ [STORAGE_KEY]: updated });
    console.log("[CamKeeper] Left page", {
      tabId,
      site: loaded.site,
      username: loaded.username,
    });
  });
}
