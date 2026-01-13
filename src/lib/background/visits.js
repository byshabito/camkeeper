/*
 * CamKeeper - Creator profile and livestream bookmark manager
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

import { getState, setState } from "../repo/state.js";
import { ACTIVE_VIEW_SESSIONS_STATE_KEY } from "../domain/stateKeys.js";
import { parseUrl } from "../domain/urls.js";
import { recordProfileView } from "../repo/profiles.js";

export function initVisitTracking(state, logDebug) {
  let mode = "focus";
  let activeSessions = new Map();
  let windowFocused = true;
  let focusedWindowId = null;
  let sessionsLoaded = false;
  let sessionsLoadPromise = null;
  const LEGACY_ACTIVE_VIEW_SESSION_STATE_KEY = "camkeeper_active_view_session_v1";

  function coerceSession(stored) {
    if (!stored || typeof stored !== "object") return null;
    if (!Number.isFinite(stored.startedAt)) return null;
    if (!Number.isFinite(stored.tabId)) return null;
    if (typeof stored.site !== "string" || typeof stored.username !== "string") return null;
    return stored;
  }

  function coerceSessionList(stored) {
    if (!Array.isArray(stored)) return [];
    return stored.map((item) => coerceSession(item)).filter(Boolean);
  }

  async function loadSessionsFromStorage() {
    if (sessionsLoaded) return activeSessions;
    if (!sessionsLoadPromise) {
      sessionsLoadPromise = (async () => {
        const stored = await getState(ACTIVE_VIEW_SESSIONS_STATE_KEY);
        activeSessions = new Map(
          coerceSessionList(stored).map((session) => [session.tabId, session]),
        );
        if (!activeSessions.size) {
          const legacy = await getState(LEGACY_ACTIVE_VIEW_SESSION_STATE_KEY);
          const legacySession = coerceSession(legacy);
          if (legacySession) {
            activeSessions.set(legacySession.tabId, legacySession);
            await persistSessions();
            await setState(LEGACY_ACTIVE_VIEW_SESSION_STATE_KEY, null);
          }
        }
        sessionsLoaded = true;
        return activeSessions;
      })();
    }
    return sessionsLoadPromise;
  }

  async function persistSessions() {
    await setState(ACTIVE_VIEW_SESSIONS_STATE_KEY, Array.from(activeSessions.values()));
  }

  async function clearSessions() {
    await setState(ACTIVE_VIEW_SESSIONS_STATE_KEY, []);
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

  async function recordActiveTimeForTab(session, endedAt) {
    await recordActiveTime(session, endedAt);
  }

  async function endSessionForTab(tabId, reason) {
    await loadSessionsFromStorage();
    const session = activeSessions.get(tabId);
    if (!session) return;
    const endedAt = Date.now();
    activeSessions.delete(tabId);
    await persistSessions();
    await recordActiveTimeForTab(session, endedAt);
    logDebug("[CamKeeper] View session ended", {
      tabId: session.tabId,
      site: session.site,
      username: session.username,
      reason,
    });
  }

  async function endAllSessions(reason) {
    await loadSessionsFromStorage();
    const sessions = Array.from(activeSessions.values());
    if (!sessions.length) return;
    activeSessions.clear();
    await persistSessions();
    for (const session of sessions) {
      await recordActiveTimeForTab(session, Date.now());
      logDebug("[CamKeeper] View session ended", {
        tabId: session.tabId,
        site: session.site,
        username: session.username,
        reason,
      });
    }
  }

  async function endSession(reason) {
    await loadSessionsFromStorage();
    if (!state.activeTabId) return;
    await endSessionForTab(state.activeTabId, reason);
  }

  async function startSession(tab) {
    if (!tab || !tab.url) return;
    await loadSessionsFromStorage();
    const parsed = parseUrl(tab.url);
    if (!parsed) return;
    if (mode === "focus" && activeSessions.size && !activeSessions.has(tab.id)) {
      await endAllSessions("session_restart");
    }
    const existing = activeSessions.get(tab.id);
    if (existing && existing.site === parsed.site && existing.username === parsed.username) return;
    if (existing) {
      await endSessionForTab(tab.id, "session_restart");
    }
    const session = {
      tabId: tab.id,
      site: parsed.site,
      username: parsed.username,
      startedAt: Date.now(),
    };
    activeSessions.set(tab.id, session);
    await persistSessions();
    logDebug("[CamKeeper] View session started", {
      tabId: tab.id,
      site: parsed.site,
      username: parsed.username,
      mode: "focus",
    });
  }

  async function startSessionForTab(tab) {
    if (!tab || !tab.url) return;
    await loadSessionsFromStorage();
    const parsed = parseUrl(tab.url);
    if (!parsed) return;
    const existing = activeSessions.get(tab.id);
    if (existing && existing.site === parsed.site && existing.username === parsed.username) return;
    if (existing) {
      await endSessionForTab(tab.id, "tab_navigate");
    }
    const session = {
      tabId: tab.id,
      site: parsed.site,
      username: parsed.username,
      startedAt: Date.now(),
    };
    activeSessions.set(tab.id, session);
    await persistSessions();
    logDebug("[CamKeeper] View session started", {
      tabId: tab.id,
      site: session.site,
      username: session.username,
      mode: "open",
    });
  }

  async function onTabActivated({ tabId, windowId }) {
    if (mode === "open") return;
    if (state.activeTabId && state.activeTabId !== tabId) {
      await endSession("tab_switch");
    }
    state.activeTabId = tabId;
    if (!windowFocused || (focusedWindowId && windowId !== focusedWindowId)) return;
    chrome.tabs.get(tabId, (tab) => startSession(tab));
  }

  async function onTabUpdated(tabId, changeInfo, tab) {
    if (mode === "open") {
      await loadSessionsFromStorage();
      if (changeInfo.url && activeSessions.has(tabId)) {
        const parsed = parseUrl(changeInfo.url);
        const current = activeSessions.get(tabId);
        if (!parsed || parsed.site !== current.site || parsed.username !== current.username) {
          await endSessionForTab(tabId, "tab_navigate");
        }
      }
      if (changeInfo.status === "complete") {
        const targetTab = tab || (await new Promise((resolve) => chrome.tabs.get(tabId, resolve)));
        await startSessionForTab(targetTab);
      }
      return;
    }

    if (changeInfo.status !== "complete") return;
    await endSessionForTab(tabId, "tab_update");
    chrome.tabs.get(tabId, (tab) => {
      if (!tab || !tab.url) return;
      if (!tab.active || !windowFocused) return;
      if (focusedWindowId && tab.windowId !== focusedWindowId) return;
      startSession(tab);
    });
  }

  async function onTabRemoved(tabId) {
    if (mode === "open") {
      await endSessionForTab(tabId, "tab_closed");
      return;
    }
    await endSessionForTab(tabId, "tab_closed");
    if (state.activeTabId === tabId) state.activeTabId = null;
  }

  async function onWindowFocusChanged(windowId) {
    if (mode === "open") return;
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

  async function syncPageSessions() {
    if (mode !== "open") return;
    await loadSessionsFromStorage();
    chrome.tabs.query({}, async (tabs) => {
      const activeIds = new Set();
      tabs.forEach((tab) => {
        activeIds.add(tab.id);
        if (!tab.url) return;
        const parsed = parseUrl(tab.url);
        if (!parsed) return;
        startSessionForTab(tab);
      });
      const orphaned = Array.from(activeSessions.keys()).filter((id) => !activeIds.has(id));
      for (const id of orphaned) {
        await endSessionForTab(id, "tab_closed");
      }
    });
  }

  async function setMode(nextMode) {
    const normalized = nextMode === "open" ? "open" : "focus";
    if (mode === normalized) return;
    mode = normalized;
    await endAllSessions("mode_switch");
    await clearSessions();
    activeSessions = new Map();
    if (mode === "open") {
      await syncPageSessions();
    }
  }

  return {
    onTabActivated,
    onTabUpdated,
    onTabRemoved,
    onWindowFocusChanged,
    setMode,
  };
}
