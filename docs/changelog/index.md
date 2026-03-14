# Changelog

## v1.1.1

- General links and unsupported socials now fall back more cleanly to Website.
- Optional Nostr sync is more reliable about keeping newer local changes and syncing livestream site settings across devices.
- The Settings page refreshes immediately after synced site changes arrive.
- The popup scroll area now stays visually flush while scrolling.

## v1.1.0

- Added optional encrypted Nostr sync for profiles and settings, with manual Pull now and Push now controls.
- Added a dedicated Nostr Sync setup area in Options for relays, local key generation, saved-key management, and sync status.
- Sync stays optional and local-first by default, and CamKeeper keeps working offline when sync is off or relays fail.
- Improved sync setup feedback with clearer status, safer masked private-key handling, and actions that stay disabled until setup is complete.
- Simplified the Settings footer links and kept packaged assets more self-contained.

## v1.0.3

- The "add to existing profile" list now favors recently updated profiles.
- Saved creators from unsupported livestream sites are kept in storage and hidden until that site is configured.

## v1.0.2

- Attaching a livestream account to an existing profile now keeps the profile's folder intact.

## v1.0.1

- Added a configurable livestream site list with Twitch and YouTube enabled by default.
- Removed older adult-platform references and fixed host-permission requirements.

## v1.0.0

- Added a quick-add keyboard shortcut for saving the current creator page.
- Added a keyboard shortcut to open the popup.
- Added visible confirmation when quick-add succeeds.

## v0.9.0

- Removed online status checks.
- Moved settings into the full options page while keeping a shortcut in the popup.
- Improved backup imports and exports, including dated backup filenames and clearer confirmation.
- Added a new view-time metric setting and made livestream-open tracking the default.
- Refined settings labels, privacy docs, and auto-save behavior.
- Removed Reddit from supported socials.

## v0.8.4

- Renamed bookmarks to profiles across the app and backup naming.
- Improved website link handling and social URL matching.
- Online status checks now default to off.
- Fixed saving when adding a new livestream username to an existing profile.

## v0.8.3

- Simplified the folder filter label to "All" and reorganized backup tools.
- Added a Bitcoin donation dialog with copy-ready payment details.
- Improved backup import wording and save feedback.

## v0.8.2

- Added drag-and-drop folder reordering.
- Custom folder order now stays consistent across the list, filter, and editor.

## v0.8.1

- Improved icons and CK logo sizing.

## v0.8.0

- Added a "Most viewed (30 days)" sort option.
- Added an online-only filter for creators.
- The popup now remembers your last sort and folder filter.
- The online filter hides itself automatically when online checks are disabled.

## v0.7.0

- Added a settings view inside the popup.

## v0.6.4

- Renamed platform wording to livestream wording across the app.

## v0.6.3

- Active view-time tracking now survives background suspends more reliably.

## v0.6.2

- Renamed the settings metadata label to "Build time."

## v0.6.1

- Minor metadata and command cleanup release.

## v0.6.0

- Added view-time tracking instead of simple visit counts.
- Expanded social support and improved automatic social profile detection.
- New and unfiled profiles now default to "No folder."
- Improved popup layout, icon styling, back navigation, and sorting of most-viewed platform chips.

## v0.5.1

- Updated the livestream status endpoint for continued online-status support.

## v0.5.0

- Added extension metadata to the settings page.
- Added a background online-check toggle and badge count.

## v0.4.2

- Editing profiles now preserves pinned and online stats.
- Added a Buy Me a Coffee sponsor link.

## v0.4.1

- Online checks now run when the popup opens, with cooldowns instead of constant background polling.

## v0.4.0

- Added online status checks.
- Added settings to turn checks on or off and adjust the interval.

## v0.3.0

- Added folders, filtering, and a folder manager.
- Added folder selection and quick folder creation in add/edit flows.
- Improved popup layout, titles, and search behavior.

## v0.2.3

- Fixed the Firefox manifest version.

## v0.2.2

- Added pinned profiles and made sorting prioritize them.
- Refined the popup search and sort row.
- Made the settings page settings-only.
- Added online and offline styling for platform chips.

## v0.2.1

- Added separate Chrome and Firefox packages.
- Added store-ready icon sizes.

## v0.2.0

- Added visit tracking with configurable focus time and cooldown.
- Added more sort options.
- Added settings-library tools with backups and modal add/edit flows.
- Added bulk merge and delete from settings.

## v0.1.0

- Added multi-platform creator profiles with notes, tags, and social links.
- Added smart URL parsing for platform and social inputs.
- Added auto-open detail view on saved creator pages and quick attachment to existing profiles.
- Added bulk merge/delete plus local JSON export/import backups.
- Shipped Chrome and Firefox support.
