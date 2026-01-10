import { getProfiles, saveProfiles, getState, setState } from "../../lib/db.js";
import { ACTIVE_VIEW_SESSION_STATE_KEY } from "../../config/background.js";

const MAX_VIEW_HISTORY_DAYS = 200;

export function initVisitTracking(state, logDebug) {
  let activeSession = null;
  let windowFocused = true;
  let focusedWindowId = null;
  let sessionLoaded = false;
  let sessionLoadPromise = null;

  function getDayStartMs(ts) {
    const day = new Date(ts);
    day.setHours(0, 0, 0, 0);
    return day.getTime();
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

  function coerceSession(stored) {
    if (!stored || typeof stored !== "object") return null;
    if (!Number.isFinite(stored.startedAt)) return null;
    if (!Number.isFinite(stored.tabId)) return null;
    if (typeof stored.site !== "string" || typeof stored.username !== "string") return null;
    return stored;
  }

  async function loadSessionFromStorage() {
    if (sessionLoaded) return activeSession;
    if (!sessionLoadPromise) {
      sessionLoadPromise = getState(ACTIVE_VIEW_SESSION_STATE_KEY).then((stored) => {
        activeSession = coerceSession(stored);
        sessionLoaded = true;
        return activeSession;
      });
    }
    return sessionLoadPromise;
  }

  async function persistSession(session) {
    if (!session) return;
    await setState(ACTIVE_VIEW_SESSION_STATE_KEY, session);
  }

  async function clearSession() {
    await setState(ACTIVE_VIEW_SESSION_STATE_KEY, null);
  }

  async function recordActiveTime(session, endedAt) {
    const durationMs = endedAt - session.startedAt;
    if (!Number.isFinite(durationMs) || durationMs <= 0) return;
    const profiles = await getProfiles();
    let updatedAny = false;
    const updated = profiles.map((profile) => {
      const cams = (profile.cams || []).map((cam) => {
        if (cam.site === session.site && cam.username === session.username) {
          updatedAny = true;
          const existing = Number.isFinite(cam.viewMs) ? cam.viewMs : 0;
          const history = Array.isArray(cam.viewHistory) ? cam.viewHistory : [];
          const dayStart = getDayStartMs(endedAt);
          let dayFound = false;
          const nextHistory = history
            .map((entry) => {
              if (!entry || typeof entry !== "object") return null;
              const entryDayStart = Number.isFinite(entry.dayStart)
                ? entry.dayStart
                : Number.isFinite(entry.endedAt)
                  ? getDayStartMs(entry.endedAt)
                  : null;
              const entryDuration = Number.isFinite(entry.durationMs) ? entry.durationMs : 0;
              if (!Number.isFinite(entryDayStart) || entryDuration <= 0) return null;
              if (entryDayStart === dayStart) {
                dayFound = true;
                return {
                  dayStart: entryDayStart,
                  durationMs: entryDuration + durationMs,
                };
              }
              return { dayStart: entryDayStart, durationMs: entryDuration };
            })
            .filter(Boolean);
          if (!dayFound) {
            nextHistory.push({ dayStart, durationMs });
          }
          nextHistory.sort((a, b) => a.dayStart - b.dayStart);
          if (nextHistory.length > MAX_VIEW_HISTORY_DAYS) {
            nextHistory.splice(0, nextHistory.length - MAX_VIEW_HISTORY_DAYS);
          }
          return {
            ...cam,
            viewMs: existing + durationMs,
            lastViewedAt: endedAt,
            viewHistory: nextHistory,
          };
        }
        return cam;
      });
      return { ...profile, cams };
    });
    if (!updatedAny) return;
    await saveProfiles(updated);
    logDebug("[CamKeeper] View time recorded", {
      tabId: session.tabId,
      site: session.site,
      username: session.username,
      durationMs,
    });
  }

  async function endSession(reason) {
    await loadSessionFromStorage();
    if (!activeSession) return;
    const endedAt = Date.now();
    const session = activeSession;
    activeSession = null;
    await clearSession();
    await recordActiveTime(session, endedAt);
    logDebug("[CamKeeper] View session ended", {
      tabId: session.tabId,
      site: session.site,
      username: session.username,
      reason,
    });
  }

  async function startSession(tab) {
    if (!tab || !tab.url) return;
    await loadSessionFromStorage();
    const parsed = parseUrlSafe(tab.url);
    if (!parsed) return;
    if (activeSession && activeSession.tabId === tab.id) return;
    if (activeSession && activeSession.tabId !== tab.id) {
      await endSession("session_restart");
    }
    activeSession = {
      tabId: tab.id,
      site: parsed.site,
      username: parsed.username,
      startedAt: Date.now(),
    };
    await persistSession(activeSession);
    logDebug("[CamKeeper] View session started", {
      tabId: tab.id,
      site: parsed.site,
      username: parsed.username,
    });
  }

  async function onTabActivated({ tabId, windowId }) {
    await loadSessionFromStorage();
    if (state.activeTabId && state.activeTabId !== tabId) {
      await endSession("tab_switch");
    }
    state.activeTabId = tabId;
    if (!windowFocused || (focusedWindowId && windowId !== focusedWindowId)) return;
    chrome.tabs.get(tabId, (tab) => startSession(tab));
  }

  async function onTabUpdated(tabId, changeInfo) {
    await loadSessionFromStorage();
    if (changeInfo.status !== "complete") return;
    if (activeSession && activeSession.tabId === tabId) {
      await endSession("tab_update");
    }
    chrome.tabs.get(tabId, (tab) => {
      if (!tab || !tab.url) return;
      if (!tab.active || !windowFocused) return;
      if (focusedWindowId && tab.windowId !== focusedWindowId) return;
      startSession(tab);
    });
  }

  async function onTabRemoved(tabId) {
    if (activeSession && activeSession.tabId === tabId) {
      await endSession("tab_closed");
    }
    if (state.activeTabId === tabId) state.activeTabId = null;
  }

  async function onWindowFocusChanged(windowId) {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      windowFocused = false;
      focusedWindowId = null;
      await endSession("window_blur");
      return;
    }
    windowFocused = true;
    focusedWindowId = windowId;
    chrome.tabs.query({ active: true, windowId }, (tabs) => {
      const tab = tabs?.[0];
      state.activeTabId = tab?.id ?? null;
      if (!tab) return;
      startSession(tab);
    });
  }

  return {
    onTabActivated,
    onTabUpdated,
    onTabRemoved,
    onWindowFocusChanged,
  };
}
