# Privacy Policy

Last updated: 2026-02-20

## Overview
This extension does not collect or sell personal data. It stores profile data and settings locally in your browser.

All core functionality runs locally in the user's browser. Optional Nostr sync is disabled by default and only runs when explicitly enabled by the user.

## Data Access
The extension accesses the following data solely to provide its core functionality:

- Current tab URL (to detect livestream profile pages when adding profiles)
- Tab URLs (to track view sessions in the background service worker for user-configured sites)
- Browser extension storage (to store profiles, folders, view history, and settings)

If optional Nostr sync is enabled, the extension also accesses:

- User-provided relay URLs
- A locally encrypted Nostr private key vault (protected with your passphrase)
- Encrypted sync payloads for profile/settings data

Core local data is:
- accessed only by the extension when it is running
- not transmitted to external servers
- not shared with third parties

When optional Nostr sync is enabled, encrypted sync payloads are transmitted to user-configured relays.

## Permissions
The extension requests the following permissions:

- **storage**  
  Used to: save profiles, folders, view history, and settings locally in the browser
- **activeTab**  
  Used to: read the active tab URL when the user adds a profile from the current page
- **tabs**  
  Used to: observe tab activity so the background service worker can track view sessions on user-configured sites
  
Only the minimum permissions required for the extension to function are requested.

## Data Storage
- Profile data, view history, and settings are stored persistently in the browser’s extension storage.
- All stored data remains local and can be removed by clearing extension data or uninstalling the extension.
- If Nostr sync is enabled, the private key used for sync is stored locally as encrypted data.
- The passphrase used to encrypt/decrypt your key is never stored by CamKeeper.
- The decrypted key may be kept in memory for the current extension session after successful unlock.

## Optional Nostr Sync

- Nostr sync is opt-in and disabled by default.
- Sync uses encrypted payloads over Nostr events (NIP-78 usage).
- Local usage/offline usage remains fully available whether sync is enabled or not.
- Sync secret material is never included in JSON backup export/import.
- The key vault remains encrypted at rest and requires your passphrase to unlock.
- Relay operators and network intermediaries may still observe transport metadata such as IP address, public key, and timing.

## Third-Party Services
This extension does not use third-party analytics, tracking, or advertising services.

If optional Nostr sync is enabled, the extension connects to relays explicitly configured by the user.

## Changes
This privacy policy may be updated if the extension's functionality changes.  
The latest version will always be available at this URL.

## Contact
For questions or concerns about this privacy policy, contact:

Email: contact@shabito.net
