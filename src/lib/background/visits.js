import { getState, setState } from "../repo/state.js";
import { ACTIVE_VIEW_SESSION_STATE_KEY } from "../domain/stateKeys.js";
import { parseUrl } from "../domain/urls.js";
import { recordProfileView } from "../repo/profiles.js";

export function initVisitTracking(state, logDebug) {
  let activeSession = null;
  let windowFocused = true;
  let focusedWindowId = null;
  let sessionLoaded = false;
  let sessionLoadPromise = null;

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
    const updated = await recordProfileView({
      site: session.site,
      username: session.username,
      endedAt,
      durationMs,
    });
    if (!updated) return;
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
    const parsed = parseUrl(tab.url);
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
