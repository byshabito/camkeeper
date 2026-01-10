export const MENU_ID = "camkeeper-open-library";
export const DEFAULT_ONLINE_CHECK_INTERVAL_MINUTES = 5;
export const DEFAULT_BACKGROUND_ONLINE_CHECKS_ENABLED = false;
export const DEFAULT_DEBUG_LOGS_ENABLED = false;
export const POPUP_ONLINE_CHECK_COOLDOWN_MINUTES = 1;
export const ONLINE_CHECK_STATE_KEY = "camkeeper_online_check_state_v1";
export const BACKGROUND_ONLINE_CHECK_STATE_KEY = "camkeeper_online_check_state_background_v1";
export const BACKGROUND_ONLINE_CHECK_ALARM = "camkeeper-online-check";
export const ACTIVE_VIEW_SESSION_STATE_KEY = "camkeeper_active_view_session_v1";

export function getDefaultSettings() {
  return {
    onlineChecksEnabled: false,
    backgroundOnlineChecksEnabled: DEFAULT_BACKGROUND_ONLINE_CHECKS_ENABLED,
    debugLogsEnabled: DEFAULT_DEBUG_LOGS_ENABLED,
    onlineCheckIntervalMinutes: DEFAULT_ONLINE_CHECK_INTERVAL_MINUTES,
  };
}
