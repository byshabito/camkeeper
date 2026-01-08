const MENU_ID = "camkeeper-open-library";
const STORAGE_KEY = "camkeeper_profiles_v1";
const SETTINGS_KEY = "camkeeper_settings_v1";
const DEFAULT_VISIT_DELAY_MS = 20 * 1000;
const DEFAULT_VISIT_COOLDOWN_MS = 10 * 60 * 1000;
const DEFAULT_ONLINE_CHECK_INTERVAL_MINUTES = 3;
const POPUP_ONLINE_CHECK_COOLDOWN_MINUTES = 1;
const ONLINE_CHECK_STATE_KEY = "camkeeper_online_check_state_v1";
const BACKGROUND_ONLINE_CHECK_STATE_KEY = "camkeeper_online_check_state_background_v1";
const BACKGROUND_ONLINE_CHECK_ALARM = "camkeeper-online-check";
const CHATURBATE_API_URL =
  "https://chaturbate.com/affiliates/api/onlinerooms/?format=json&wm=SBlL1";
const STRIPCHAT_API_BASE = "https://stripchat.com/api/front/v2/models/username";
const pendingTimers = new Map();
const lastLoaded = new Map();
let activeTabId = null;
let settings = {
  visitDelayMs: DEFAULT_VISIT_DELAY_MS,
  visitCooldownMs: DEFAULT_VISIT_COOLDOWN_MS,
  onlineChecksEnabled: true,
  backgroundOnlineChecksEnabled: false,
  onlineCheckIntervalMinutes: DEFAULT_ONLINE_CHECK_INTERVAL_MINUTES,
};
let lastOnlineChecksEnabled = true;
let lastBackgroundChecksEnabled = false;

function loadSettings() {
  chrome.storage.local.get(SETTINGS_KEY, (res) => {
    const data = res[SETTINGS_KEY] || {};
    const nextOnlineChecksEnabled =
      typeof data.onlineChecksEnabled === "boolean" ? data.onlineChecksEnabled : true;
    settings = {
      visitDelayMs: Number.isFinite(data.visitDelayMs)
        ? data.visitDelayMs
        : DEFAULT_VISIT_DELAY_MS,
      visitCooldownMs: Number.isFinite(data.visitCooldownMs)
        ? data.visitCooldownMs
        : DEFAULT_VISIT_COOLDOWN_MS,
      onlineChecksEnabled: nextOnlineChecksEnabled,
      backgroundOnlineChecksEnabled:
        typeof data.backgroundOnlineChecksEnabled === "boolean"
          ? data.backgroundOnlineChecksEnabled
          : false,
      onlineCheckIntervalMinutes: Number.isFinite(data.onlineCheckIntervalMinutes)
        ? Math.max(3, data.onlineCheckIntervalMinutes)
        : DEFAULT_ONLINE_CHECK_INTERVAL_MINUTES,
    };
    if (!settings.onlineChecksEnabled) {
      clearOnlineStatuses();
      settings.backgroundOnlineChecksEnabled = false;
    } else if (!lastOnlineChecksEnabled && settings.onlineChecksEnabled) {
      refreshOnlineStatus();
    }
    lastOnlineChecksEnabled = settings.onlineChecksEnabled;

    syncBackgroundOnlineChecks();
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[SETTINGS_KEY]) {
    loadSettings();
  }
});

loadSettings();

function syncBackgroundOnlineChecks() {
  if (!settings.onlineChecksEnabled || !settings.backgroundOnlineChecksEnabled) {
    chrome.alarms.clear(BACKGROUND_ONLINE_CHECK_ALARM);
    setBadgeCount(0);
    lastBackgroundChecksEnabled = false;
    return;
  }

  const interval = Math.max(3, settings.onlineCheckIntervalMinutes);
  chrome.alarms.create(BACKGROUND_ONLINE_CHECK_ALARM, { periodInMinutes: interval });
  if (!lastBackgroundChecksEnabled) {
    refreshOnlineStatus();
  }
  lastBackgroundChecksEnabled = true;
  updateBadgeFromStorage();
}

function countOnlineProfiles(profiles) {
  return profiles.reduce((count, profile) => {
    const platforms = profile?.platforms || [];
    const hasOnline = platforms.some((platform) => Boolean(platform?.online));
    return hasOnline ? count + 1 : count;
  }, 0);
}

function setBadgeCount(count) {
  const text = count > 0 ? (count > 99 ? "99+" : String(count)) : "";
  if (chrome.action?.setBadgeText) {
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color: "#2ecc71" });
    return;
  }
  if (chrome.browserAction?.setBadgeText) {
    chrome.browserAction.setBadgeText({ text });
    chrome.browserAction.setBadgeBackgroundColor({ color: "#2ecc71" });
  }
}

function updateBadgeCount(count) {
  if (!settings.onlineChecksEnabled || !settings.backgroundOnlineChecksEnabled) return;
  setBadgeCount(count);
}

function updateBadgeFromStorage() {
  if (!settings.onlineChecksEnabled || !settings.backgroundOnlineChecksEnabled) return;
  chrome.storage.local.get(STORAGE_KEY, (res) => {
    const profiles = Array.isArray(res[STORAGE_KEY]) ? res[STORAGE_KEY] : [];
    updateBadgeCount(countOnlineProfiles(profiles));
  });
}

function summarizeOnlineProfiles(profiles, onlineSet, stripchatStatus) {
  return profiles.map((profile) => {
    const platforms = profile?.platforms || [];
    const platformResults = platforms
      .filter((platform) =>
        platform?.site === "chaturbate.com" || platform?.site === "stripchat.com"
      )
      .map((platform) => {
        const username = (platform?.username || "").toLowerCase();
        if (platform.site === "chaturbate.com") {
          const checked = Boolean(onlineSet && username);
          const result = checked ? onlineSet.has(username) : null;
          return { site: platform.site, username, checked, result };
        }
        if (platform.site === "stripchat.com") {
          const checked = Boolean(stripchatStatus && stripchatStatus.has(username));
          const result = checked ? stripchatStatus.get(username) : null;
          return { site: platform.site, username, checked, result };
        }
        return null;
      })
      .filter(Boolean);
    const online = platforms.some((platform) => Boolean(platform?.online));
    return {
      id: profile?.id || null,
      name: profile?.name || "",
      online,
      platforms: platformResults,
    };
  });
}

function clearOnlineStatuses() {
  chrome.storage.local.get(STORAGE_KEY, (res) => {
    const profiles = Array.isArray(res[STORAGE_KEY]) ? res[STORAGE_KEY] : [];
    let changed = 0;
    const updated = profiles.map((profile) => {
      const platforms = (profile.platforms || []).map((platform) => {
        if (!platform.online) return platform;
        changed += 1;
        return { ...platform, online: false };
      });
      return { ...profile, platforms };
    });
    if (!changed) return;
    chrome.storage.local.set({ [STORAGE_KEY]: updated });
    console.log("[CamKeeper] Online status cleared", { changed });
    updateBadgeCount(0);
  });
}

function getLastOnlineCheckAt(stateKey) {
  return new Promise((resolve) => {
    chrome.storage.local.get(stateKey, (res) => {
      const stored = res[stateKey];
      resolve(Number.isFinite(stored?.lastCheckAt) ? stored.lastCheckAt : 0);
    });
  });
}

function setLastOnlineCheckAt(stateKey, timestamp) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [stateKey]: { lastCheckAt: timestamp } }, resolve);
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

async function fetchStripchatStatus(username) {
  const url = `${STRIPCHAT_API_BASE}/${encodeURIComponent(username)}/cam`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      console.warn("[CamKeeper] Stripchat fetch failed", username, response.status);
      return null;
    }
    const data = await response.json();
    if (typeof data?.cam?.isCamAvailable === "boolean") {
      return data.cam.isCamAvailable;
    }
    if (typeof data?.user?.isLive === "boolean") {
      return data.user.isLive;
    }
    // Treat missing status info as offline so stale online flags clear.
    return false;
  } catch (error) {
    console.warn("[CamKeeper] Stripchat fetch failed", username, error);
    return null;
  }
}

async function fetchStripchatStatuses(usernames) {
  const unique = Array.from(new Set(usernames));
  if (!unique.length) return new Map();

  const concurrency = 5;
  const results = new Map();
  let index = 0;

  const worker = async () => {
    while (index < unique.length) {
      const current = unique[index];
      index += 1;
      const status = await fetchStripchatStatus(current);
      if (status === null) continue;
      results.set(current, status);
    }
  };

  await Promise.all(Array.from({ length: concurrency }, worker));
  console.log("[CamKeeper] Stripchat status fetched", {
    checked: unique.length,
    results: results.size,
  });
  return results;
}

async function refreshOnlineStatus(options = {}) {
  if (!settings.onlineChecksEnabled) return;
  const requestedMinutes =
    typeof options.minMinutes === "number"
      ? options.minMinutes
      : settings.onlineCheckIntervalMinutes;
  const minMinutes = Math.max(1, Number.isFinite(requestedMinutes) ? requestedMinutes : 3);
  const stateKey = options.stateKey || ONLINE_CHECK_STATE_KEY;
  const now = Date.now();
  const lastCheckAt = await getLastOnlineCheckAt(stateKey);
  if (now - lastCheckAt < minMinutes * 60 * 1000) {
    console.log("[CamKeeper] Online check skipped (cooldown)", {
      minutes: minMinutes,
    });
    return;
  }
  await setLastOnlineCheckAt(stateKey, now);
  const online = await fetchChaturbateOnlineSet();

  chrome.storage.local.get(STORAGE_KEY, async (res) => {
    const profiles = Array.isArray(res[STORAGE_KEY]) ? res[STORAGE_KEY] : [];
    const stripchatUsers = [];
    const chaturbateUsers = [];
    profiles.forEach((profile) => {
      (profile.platforms || []).forEach((platform) => {
        if (platform.site !== "stripchat.com") return;
        const username = (platform.username || "").trim().toLowerCase();
        if (username) stripchatUsers.push(username);
      });
      (profile.platforms || []).forEach((platform) => {
        if (platform.site !== "chaturbate.com") return;
        const username = (platform.username || "").trim().toLowerCase();
        if (username) chaturbateUsers.push(username);
      });
    });

    const stripchatStatus = await fetchStripchatStatuses(stripchatUsers);
    let changed = 0;
    const updated = profiles.map((profile) => {
      const platforms = (profile.platforms || []).map((platform) => {
        const username = (platform.username || "").toLowerCase();
        if (platform.site === "chaturbate.com") {
          if (!online) return platform;
          const isOnline = online.has(username);
          if (platform.online === isOnline) return platform;
          changed += 1;
          return { ...platform, online: isOnline };
        }
        if (platform.site === "stripchat.com") {
          if (!stripchatStatus.has(username)) return platform;
          const isOnline = stripchatStatus.get(username);
          if (platform.online === isOnline) return platform;
          changed += 1;
          return { ...platform, online: isOnline };
        }
        return platform;
      });
      return { ...profile, platforms };
    });

    chrome.storage.local.set({ [STORAGE_KEY]: updated });
    console.log("[CamKeeper] Online status updated", {
      profiles: profiles.length,
      changed,
      chaturbateChecked: chaturbateUsers,
      stripchatChecked: stripchatUsers,
      stripchatChecks: stripchatUsers.length,
      chaturbateChecks: online ? online.size : 0,
      results: summarizeOnlineProfiles(updated, online, stripchatStatus),
    });
    updateBadgeCount(countOnlineProfiles(updated));
  });
}

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
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== MENU_ID) return;
  openLibrary();
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "open-library") {
    openLibrary();
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "online-check") {
    refreshOnlineStatus({
      minMinutes: POPUP_ONLINE_CHECK_COOLDOWN_MINUTES,
      stateKey: ONLINE_CHECK_STATE_KEY,
    });
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm?.name === BACKGROUND_ONLINE_CHECK_ALARM) {
    refreshOnlineStatus({
      stateKey: BACKGROUND_ONLINE_CHECK_STATE_KEY,
    });
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (!settings.backgroundOnlineChecksEnabled) return;
  if (changes[STORAGE_KEY]) {
    updateBadgeFromStorage();
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
