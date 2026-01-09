import { getProfiles, saveProfiles } from "../../lib/db.js";

export function initVisitTracking(state, settings, logDebug) {
  const pendingTimers = new Map();
  const lastLoaded = new Map();

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

  function scheduleVisitCheck(tabId) {
    const loaded = lastLoaded.get(tabId);
    if (!loaded || loaded.counted) return;
    if (pendingTimers.has(tabId)) return;
    const timeoutId = setTimeout(() => recordVisit(tabId), settings.visitDelayMs);
    pendingTimers.set(tabId, timeoutId);
    logDebug("[CamKeeper] Scheduled visit check", { tabId });
  }

  function clearVisitTimer(tabId) {
    const timeoutId = pendingTimers.get(tabId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      pendingTimers.delete(tabId);
      logDebug("[CamKeeper] Cleared visit timer", { tabId });
    }
  }

  function recordVisit(tabId) {
    chrome.tabs.get(tabId, async (tab) => {
      pendingTimers.delete(tabId);
      if (!tab || !tab.active || !tab.url) return;
      const parsed = parseUrlSafe(tab.url);
      const loaded = lastLoaded.get(tabId);
      if (!parsed || !loaded) {
        logDebug("[CamKeeper] Visit skipped (missing parsed/loaded)", {
          tabId,
          parsed,
          loaded,
        });
        return;
      }
      if (loaded.counted) {
        logDebug("[CamKeeper] Visit skipped (already counted)", {
          tabId,
          parsed,
        });
        return;
      }
      if (parsed.site !== loaded.site || parsed.username !== loaded.username) {
        logDebug("[CamKeeper] Visit skipped (URL mismatch)", {
          tabId,
          parsed,
          loaded,
        });
        return;
      }
      loaded.counted = true;
      logDebug("[CamKeeper] Recording visit", { tabId, parsed });

      const profiles = await getProfiles();
      let shouldCount = false;
      const updated = profiles.map((profile) => {
        const platforms = (profile.platforms || []).map((platform) => {
          if (platform.site === parsed.site && platform.username === parsed.username) {
            const lastLeftAt = Number.isFinite(platform.lastLeftAt) ? platform.lastLeftAt : 0;
            if (Date.now() - lastLeftAt < settings.visitCooldownMs) {
              logDebug("[CamKeeper] Visit skipped (cooldown)", {
                tabId,
                site: parsed.site,
                username: parsed.username,
              });
              return platform;
            }
            shouldCount = true;
            const count = Number.isFinite(platform.visitCount) ? platform.visitCount : 0;
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
      await saveProfiles(updated);
      logDebug("[CamKeeper] Visit saved", {
        tabId,
        site: parsed.site,
        username: parsed.username,
      });
    });
  }

  async function markLeft(tabId) {
    const loaded = lastLoaded.get(tabId);
    if (!loaded || !loaded.recorded) return;
    const profiles = await getProfiles();
    const updated = profiles.map((profile) => {
      const platforms = (profile.platforms || []).map((platform) => {
        if (platform.site === loaded.site && platform.username === loaded.username) {
          return {
            ...platform,
            lastLeftAt: Date.now(),
          };
        }
        return platform;
      });
      return { ...profile, platforms };
    });
    await saveProfiles(updated);
    logDebug("[CamKeeper] Left page", {
      tabId,
      site: loaded.site,
      username: loaded.username,
    });
  }

  function onTabActivated({ tabId }) {
    if (state.activeTabId && state.activeTabId !== tabId) {
      markLeft(state.activeTabId);
      clearVisitTimer(state.activeTabId);
    }
    state.activeTabId = tabId;
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
  }

  function onTabUpdated(tabId, changeInfo) {
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
  }

  function onTabRemoved(tabId) {
    markLeft(tabId);
    clearVisitTimer(tabId);
    if (state.activeTabId === tabId) state.activeTabId = null;
  }

  function onWindowFocusChanged(windowId) {
    if (windowId === chrome.windows.WINDOW_ID_NONE && state.activeTabId) {
      markLeft(state.activeTabId);
      clearVisitTimer(state.activeTabId);
      return;
    }
    if (state.activeTabId && windowId !== chrome.windows.WINDOW_ID_NONE) {
      scheduleVisitCheck(state.activeTabId);
    }
  }

  return {
    onTabActivated,
    onTabUpdated,
    onTabRemoved,
    onWindowFocusChanged,
  };
}
