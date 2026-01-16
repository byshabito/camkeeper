# Changelog

## v1.0.3

- Add comprehensive unit and property test coverage across domain, repo, UI, and background logic

## v1.0.2

- Preserve folders when attaching to an exisiting profile

## v1.0.1

- Add configurable livestream site list with Twitch/YouTube defaults
- Remove adult platform references and fixed host permissions

## v1.0.0

- Change placeholder tags
- Add quick-add keyboard shortcut for saving the current creator page
- Add confirmation badge for quick-add shortcut
- Add keyboard shortcut to open the popup

## v0.9.0

- Remove online status checks
- Remove context menu library shortcut
- Refactor code
- Add privacy policy
- Remove Reddit from supported socials
- Move settings to options page and keep popup settings button as a shortcut
- Fix backup import flow and add import confirmation toast
- Include timestamps in backup export filenames
- Update About label and license text in settings
- Add a view time metric setting (focus vs page sessions)
- Remove the debug logs setting
- Default view time metric to Livestream open
- Add a stronger hover color for primary buttons
- Remove Save button and save automatically when value changes

## v0.8.4

- Rename bookmarks to profiles across the UI and backup file name
- Normalize website socials and improve URL matching for social detail views
- Default online status checks to off with a 5-minute refresh interval
- Clarify backup and configuration setting labels
- Add multi-size favicons to the popup and options pages
- Fix saving when attaching a new livestream username to an existing profile

## v0.8.3

- Shorten folder filter label to "All"
- Split backup tools into their own section with separate download/import rows
- Rename settings section headers to Configuration and About
- Add Bitcoin donation button and modal with copyable Lightning/LNURL/on-chain details
- Tweak backup import button label and Bitcoin modal title
- Add floating success feedback when settings are saved

## v0.8.2

- Add manual drag-and-drop ordering for folders
- Persist custom folder order across folder list, filter, and editor
- Add drag handle and tidy folder manager layout

## v0.8.1

- Improve icons and CK logo size

## v0.8.0

- Add most viewed (30 days) sort option
- Track daily view history buckets for rolling view totals
- Remember last selected sort in the popup
- Add filter for currently online creators
- Remember last selected folder filter in the popup
- Hide the online filter when online checks are disabled (live update)

## v0.7.0

- Add settings view to the popup with options page embedding it

## v0.6.4

- Rename platform references to livestream

## v0.6.3

- Persist active view sessions for MV3 background suspends

## v0.6.2

- Remove background command listener when commands are unused
- Rename settings metadata label to "Build time"

## v0.6.1

- Add homepage url to manifest
- Remove commands

## v0.6.0

- Centralize storage access behind the unified API
- Add shared online status API modules
- Add shared background config defaults
- Refactor background logic into modular services
- Default folder selector to "No folder" for new or unfiled profiles
- Track active view time instead of visit counts
- Sort platform chips by most-viewed first
- Expand socials support and auto-detect matching social profiles
- Refresh popup layout and icon styling
- Replace popup back labels with icon buttons

## v0.5.1

- Switch livestream status endpoint and parsing

## v0.5.0

- Add extension metadata to settings page
- Add background online check toggle and badge count

## v0.4.2

- Preserve pinned and online stats when editing profiles
- Add BMC sponsor link

## v0.4.1

- Run online checks on popup open with cooldown (no background polling)

## v0.4.0

- Add background online status checks
- Add settings to enable checks and set the interval

## v0.3.0

- Add folder organization with filter and manager
- Add folder dropdown + new folder input in add/edit
- Refine popup layout, titles, and search interactions

## v0.2.3

- Fix firefox manifest version

## v0.2.2

- Pin profiles and prioritize pinned items in sorting
- Refined popup search/sort row with icon-triggered search
- Settings page is now settings-only
- Platform chips support online/offline styling

## v0.2.1

- Separate Chrome/Firefox manifests with build script
- Store-ready icon sizes (16/32/48/128/256)

## v0.2.0

- Visit tracking with configurable focus time + cooldown
- Sort by updated/name/visits
- Settings library with modal add/edit and backup tools
- Bulk merge/delete from settings

## v0.1.0

- Multi-platform profiles with notes, tags, and socials
- Smart URL parsing for platform/social inputs
- Auto detail view on saved creator pages
- Add current platform to an existing profile
- Bulk select to merge or delete
- Local-only storage with JSON export/import
- Chrome and Firefox support (fallback library shortcut)
