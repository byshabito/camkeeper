# Store Listing

---

## Single purpose description

A local-first cross-site creator profile manager for saving and organizing creator profiles in one place.

---

## Description

CamKeeper is a local-first creator profile manager that helps you save, organize, and quickly revisit creator info across platforms.

Instead of scattered bookmarks and notes, CamKeeper lets you build one unified profile per creator, linking multiple usernames/pages, adding notes, tags, links, and folders, so your context is always in one place when you come back later.

By default, your data stays on your device. No account required. No analytics or tracking.

### Key features

- Unified local profiles that can link multiple sites, usernames, and URLs
- Fast save flow from supported creator pages (with configurable site detection)
- Default support for Twitch and YouTube, with customizable site settings
- Folder organization, filtering, and sorting for quick navigation
- Notes, tags, and external links to keep profile context useful
- Local view-time tracking for saved livestream pages
- Optional JSON export/import for backup and migration
- Optional encrypted Nostr sync (off by default) for users who want cross-device sync

### Why install CamKeeper

- Replace messy bookmarks with a focused creator profile system
- Find important creator details faster when revisiting pages
- Keep your data private and under your control
- Stay fully usable offline/local-first, with optional sync only if you choose it

---

## Permission justifications

- `storage`: Used to save creator profiles, folders, notes/tags/links, view-time history, and extension settings locally in the browser.
- `activeTab`: Used during user-initiated actions to read the current page URL so users can save or attach the active creator page to a profile.
- `tabs`: Used to observe tab activation/updates/removals and query tab URLs so the extension can track local view-time metrics for saved creator pages on supported sites.
