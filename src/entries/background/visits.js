import { getProfiles, saveProfiles } from "../../lib/db.js";

export function initVisitTracking(state, logDebug) {
  let activeSession = null;
  let windowFocused = true;

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

  async function recordActiveTime(session, endedAt) {
    const durationMs = endedAt - session.startedAt;
    if (!Number.isFinite(durationMs) || durationMs <= 0) return;
    const profiles = await getProfiles();
    let updatedAny = false;
    const updated = profiles.map((profile) => {
      const platforms = (profile.platforms || []).map((platform) => {
        if (platform.site === session.site && platform.username === session.username) {
          updatedAny = true;
          const existing = Number.isFinite(platform.viewMs) ? platform.viewMs : 0;
          return {
            ...platform,
            viewMs: existing + durationMs,
            lastViewedAt: endedAt,
          };
        }
        return platform;
      });
      return { ...profile, platforms };
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

  function endSession(reason) {
    if (!activeSession) return;
    const endedAt = Date.now();
    const session = activeSession;
    activeSession = null;
    recordActiveTime(session, endedAt);
    logDebug("[CamKeeper] View session ended", {
      tabId: session.tabId,
      site: session.site,
      username: session.username,
      reason,
    });
  }

  function startSession(tab) {
    if (!tab || !tab.url) return;
    const parsed = parseUrlSafe(tab.url);
    if (!parsed) return;
    if (activeSession && activeSession.tabId === tab.id) return;
    activeSession = {
      tabId: tab.id,
      site: parsed.site,
      username: parsed.username,
      startedAt: Date.now(),
    };
    logDebug("[CamKeeper] View session started", {
      tabId: tab.id,
      site: parsed.site,
      username: parsed.username,
    });
  }

  function onTabActivated({ tabId }) {
    if (state.activeTabId && state.activeTabId !== tabId) {
      endSession("tab_switch");
    }
    state.activeTabId = tabId;
    if (!windowFocused) return;
    chrome.tabs.get(tabId, (tab) => startSession(tab));
  }

  function onTabUpdated(tabId, changeInfo) {
    if (changeInfo.status !== "complete") return;
    if (activeSession && activeSession.tabId === tabId) {
      endSession("tab_update");
    }
    chrome.tabs.get(tabId, (tab) => {
      if (!tab || !tab.url) return;
      if (!tab.active || !windowFocused) return;
      startSession(tab);
    });
  }

  function onTabRemoved(tabId) {
    if (activeSession && activeSession.tabId === tabId) {
      endSession("tab_closed");
    }
    if (state.activeTabId === tabId) state.activeTabId = null;
  }

  function onWindowFocusChanged(windowId) {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      windowFocused = false;
      endSession("window_blur");
      return;
    }
    windowFocused = true;
    if (!state.activeTabId) return;
    chrome.tabs.get(state.activeTabId, (tab) => {
      if (!tab || !tab.active) return;
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
