export const DEFAULT_DEBUG_LOGS_ENABLED = false;
export const ACTIVE_VIEW_SESSION_STATE_KEY = "camkeeper_active_view_session_v1";

export function getDefaultSettings() {
  return {
    debugLogsEnabled: DEFAULT_DEBUG_LOGS_ENABLED,
  };
}
