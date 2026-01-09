import {
  BACKGROUND_ONLINE_CHECK_ALARM,
  BACKGROUND_ONLINE_CHECK_STATE_KEY,
  DEFAULT_DEBUG_LOGS_ENABLED,
  DEFAULT_ONLINE_CHECK_INTERVAL_MINUTES,
  ONLINE_CHECK_STATE_KEY,
  POPUP_ONLINE_CHECK_COOLDOWN_MINUTES,
} from "../../config/background.js";
import { fetchOnlineStatuses as fetchChaturbateStatuses } from "../../lib/onlineStatus/chaturbate.js";
import { fetchOnlineStatuses as fetchStripchatStatuses } from "../../lib/onlineStatus/stripchat.js";
import { getProfiles, saveProfiles, getState, setState, STORAGE_KEY } from "../../lib/db.js";

let settings = {
  onlineChecksEnabled: true,
  backgroundOnlineChecksEnabled: false,
  debugLogsEnabled: DEFAULT_DEBUG_LOGS_ENABLED,
  onlineCheckIntervalMinutes: DEFAULT_ONLINE_CHECK_INTERVAL_MINUTES,
};

function logDebug(message, data) {
  if (!settings.debugLogsEnabled) return;
  console.log(message, data ?? {});
}

function countOnlineProfiles(profiles) {
  return profiles.reduce((count, profile) => {
    const cams = profile?.cams || [];
    const hasOnline = cams.some((cam) => Boolean(cam?.online));
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

async function updateBadgeFromStorage() {
  if (!settings.onlineChecksEnabled || !settings.backgroundOnlineChecksEnabled) return;
  const profiles = await getProfiles();
  updateBadgeCount(countOnlineProfiles(profiles));
}

async function clearOnlineStatuses() {
  const profiles = await getProfiles();
  let changed = 0;
  const updated = profiles.map((profile) => {
    const cams = (profile.cams || []).map((cam) => {
      if (!cam.online) return cam;
      changed += 1;
      return { ...cam, online: false };
    });
    return { ...profile, cams };
  });
  if (!changed) return;
  await saveProfiles(updated);
  logDebug("[CamKeeper] Online status cleared", { changed });
  updateBadgeCount(0);
}

function summarizeOnlineProfiles(profiles, chaturbateStatus, stripchatStatus) {
  return profiles.map((profile) => {
    const cams = profile?.cams || [];
    const camResults = cams
      .filter((cam) => cam?.site === "chaturbate.com" || cam?.site === "stripchat.com")
      .map((cam) => {
        const username = (cam?.username || "").toLowerCase();
        if (cam.site === "chaturbate.com") {
          const checked = Boolean(chaturbateStatus && chaturbateStatus.has(username));
          const result = checked ? chaturbateStatus.get(username) : null;
          return { site: cam.site, username, checked, result };
        }
        if (cam.site === "stripchat.com") {
          const checked = Boolean(stripchatStatus && stripchatStatus.has(username));
          const result = checked ? stripchatStatus.get(username) : null;
          return { site: cam.site, username, checked, result };
        }
        return null;
      })
      .filter(Boolean);
    const online = cams.some((cam) => Boolean(cam?.online));
    return {
      id: profile?.id || null,
      name: profile?.name || "",
      online,
      cams: camResults,
    };
  });
}

function getLastOnlineCheckAt(stateKey) {
  return getState(stateKey).then((stored) =>
    Number.isFinite(stored?.lastCheckAt) ? stored.lastCheckAt : 0
  );
}

function setLastOnlineCheckAt(stateKey, timestamp) {
  return setState(stateKey, { lastCheckAt: timestamp });
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
    logDebug("[CamKeeper] Online check skipped (cooldown)", {
      minutes: minMinutes,
    });
    return;
  }
  await setLastOnlineCheckAt(stateKey, now);

  const profiles = await getProfiles();
  const stripchatUsers = [];
  const chaturbateUsers = [];
  profiles.forEach((profile) => {
    (profile.cams || []).forEach((cam) => {
      if (cam.site !== "stripchat.com") return;
      const username = (cam.username || "").trim().toLowerCase();
      if (username) stripchatUsers.push(username);
    });
    (profile.cams || []).forEach((cam) => {
      if (cam.site !== "chaturbate.com") return;
      const username = (cam.username || "").trim().toLowerCase();
      if (username) chaturbateUsers.push(username);
    });
  });

  const [chaturbateStatus, stripchatStatus] = await Promise.all([
    fetchChaturbateStatuses(chaturbateUsers),
    fetchStripchatStatuses(stripchatUsers),
  ]);
  let changed = 0;
  const updated = profiles.map((profile) => {
    const cams = (profile.cams || []).map((cam) => {
      const username = (cam.username || "").toLowerCase();
      if (cam.site === "chaturbate.com") {
        if (!chaturbateStatus.has(username)) return cam;
        const isOnline = chaturbateStatus.get(username);
        if (cam.online === isOnline) return cam;
        changed += 1;
        return { ...cam, online: isOnline };
      }
      if (cam.site === "stripchat.com") {
        if (!stripchatStatus.has(username)) return cam;
        const isOnline = stripchatStatus.get(username);
        if (cam.online === isOnline) return cam;
        changed += 1;
        return { ...cam, online: isOnline };
      }
      return cam;
    });
    return { ...profile, cams };
  });

  await saveProfiles(updated);
  logDebug("[CamKeeper] Online status updated", {
    profiles: profiles.length,
    changed,
    chaturbateChecked: chaturbateUsers,
    stripchatChecked: stripchatUsers,
    stripchatChecks: stripchatUsers.length,
    chaturbateChecks: chaturbateStatus.size,
    results: summarizeOnlineProfiles(updated, chaturbateStatus, stripchatStatus),
  });
  updateBadgeCount(countOnlineProfiles(updated));
}

function syncBackgroundOnlineChecks() {
  if (!settings.onlineChecksEnabled || !settings.backgroundOnlineChecksEnabled) {
    chrome.alarms.clear(BACKGROUND_ONLINE_CHECK_ALARM);
    setBadgeCount(0);
    return;
  }

  const interval = Math.max(3, settings.onlineCheckIntervalMinutes);
  chrome.alarms.create(BACKGROUND_ONLINE_CHECK_ALARM, { periodInMinutes: interval });
  updateBadgeFromStorage();
}

function onStorageChanged(changes) {
  if (changes[STORAGE_KEY]) {
    updateBadgeFromStorage();
  }
}

function onSettingsUpdated(nextSettings, state) {
  settings = {
    ...settings,
    ...nextSettings,
  };
  if (!settings.onlineChecksEnabled) {
    clearOnlineStatuses();
    settings.backgroundOnlineChecksEnabled = false;
  } else if (!state.lastOnlineChecksEnabled && settings.onlineChecksEnabled) {
    refreshOnlineStatus();
  }
  state.lastOnlineChecksEnabled = settings.onlineChecksEnabled;
  syncBackgroundOnlineChecks();
}

function onMessage(message) {
  if (message?.type === "online-check") {
    refreshOnlineStatus({
      minMinutes: POPUP_ONLINE_CHECK_COOLDOWN_MINUTES,
      stateKey: ONLINE_CHECK_STATE_KEY,
    });
  }
}

function onAlarm(alarm) {
  if (alarm?.name === BACKGROUND_ONLINE_CHECK_ALARM) {
    refreshOnlineStatus({
      stateKey: BACKGROUND_ONLINE_CHECK_STATE_KEY,
    });
  }
}

export function initOnlineStatus(state) {
  return {
    onSettingsUpdated,
    onStorageChanged,
    onMessage,
    onAlarm,
  };
}
