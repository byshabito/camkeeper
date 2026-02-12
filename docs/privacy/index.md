# Privacy Policy

Last updated: 2026-02-12

## Overview

CamKeeper is built to run locally in your browser.
It does not collect, sell, or share personal data.
Core features remain fully local and offline-capable.

## Data access

CamKeeper accesses the minimum browser data required for core features:

- Current tab URL, so you can save or attach the active page to a profile.
- Tab URLs and tab activity events, so the background service worker can track local view sessions for configured livestream sites.
- Extension storage data, so profiles, settings, folder order, and view history persist across sessions.

If you enable optional Nostr sync, CamKeeper also accesses:

- User-configured relay URLs.
- A locally stored Nostr private key (`nsec` or equivalent hex key).
- Encrypted sync payloads used for profile/settings synchronization.

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
- If Nostr sync is enabled, your Nostr key is stored locally in extension storage on that device.

## Export and import

- CamKeeper supports JSON export/import for backup and migration.
- Exported files are created locally on your device.
- Imported files are processed locally in your browser.

## Network usage

By default, CamKeeper does not send profile data, notes, tags, or settings to external services.
If optional Nostr sync is enabled, CamKeeper sends encrypted sync payloads to relays you configured.
The extension has no analytics, telemetry, or advertising integrations.

## Optional Nostr sync

- Nostr is an open relay-based protocol for signed events.
- Nostr sync is opt-in and disabled by default.
- Sync payloads are encrypted and signed.
- Local usage and offline usage remain available whether sync is enabled or not.
- Backup export/import does not include your Nostr private key.
- Relay operators and network intermediaries may still observe metadata such as IP address, public key, and timing.
- Your private key (`nsec`) must remain secret and should never be shared with anyone, including project maintainers or support.

## Third-party services

CamKeeper does not use third-party trackers or ad networks.
If optional sync is enabled, it connects to relays explicitly configured by you.

## Changes to this policy

This privacy policy may be updated when extension behavior changes.
The latest version is published on this documentation site.

## Contact

If you have privacy questions, contact: `contact@shabito.net`
