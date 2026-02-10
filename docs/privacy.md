# Privacy Policy

Last updated: 2026-02-10

## Overview

CamKeeper is built to run locally in your browser.
It does not collect, sell, or share personal data.

## Data access

CamKeeper accesses the minimum browser data required for core features:

- Current tab URL, so you can save or attach the active page to a profile.
- Tab URLs and tab activity events, so the background service worker can track local view sessions for configured livestream sites.
- Extension storage data, so profiles, settings, folder order, and view history persist across sessions.

This data is used only by the extension while it runs in your browser.

## Permissions

CamKeeper requests these extension permissions:

- `storage`
  - Used to save profiles, settings, and local activity data in browser extension storage.
- `activeTab`
  - Used to read the active tab URL when you save from the current page.
- `tabs`
  - Used to observe tab changes for local view session tracking on user-configured sites.

No extra permissions are requested beyond what is needed for these features.

## Storage and retention

- Data is stored locally in your browser via extension storage.
- Data stays on your device unless you explicitly export it.
- You can delete data by clearing extension data or uninstalling CamKeeper.

## Export and import

- CamKeeper supports JSON export/import for backup and migration.
- Exported files are created locally on your device.
- Imported files are processed locally in your browser.

## Network usage

CamKeeper does not send profile data, notes, tags, or settings to external services.
The extension has no analytics, telemetry, or advertising integrations.

## Third-party services

CamKeeper does not use third-party trackers or ad networks.

## Changes to this policy

This privacy policy may be updated when extension behavior changes.
The latest version is published on this documentation site.

## Contact

If you have privacy questions, contact: `contact@shabito.net`
