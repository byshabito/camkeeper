---
layout: home

hero:
  name: "CamKeeper"
  text: "Cross-site creator profile manager"
  tagline: "Save creator profiles across sites, organize them your way, and stay local-first with optional encrypted Nostr sync."
  image:
    src: /icon-256.png
    alt: CamKeeper icon
  actions:
    - theme: brand
      text: Add to Chrome
      link: https://chromewebstore.google.com/detail/camkeeper/plgibmbnfodgifhdggcnbihloihiafep/
    - theme: brand
      text: Add to Firefox
      link: https://addons.mozilla.org/firefox/addon/camkeeper/

features:
  - title: Unified profiles
    details: Keep one local profile per creator and attach usernames or URLs from multiple platforms.
  - title: Fast page detection
    details: Detects supported pages automatically, with Twitch and YouTube enabled by default.
  - title: Organized by design
    details: Use folders, tags, notes, sorting, and bulk actions to keep large lists manageable.
  - title: Privacy first
    details: No account, no telemetry, and no third-party tracking. Local-first with optional encrypted sync.
---

## What CamKeeper does

CamKeeper helps you manage creator profiles across sites from one extension popup.
You can save profiles, attach multiple site identities, track local view time for configured livestream sites, and quickly find people again later.

![CamKeeper profile details](./screenshots/details.jpg)

## Quick start

1. Visit a supported creator profile page.
2. Click the CamKeeper extension icon.
3. Save the creator as a new profile, or attach the page to an existing profile.
4. Add notes, tags, and folders to keep everything organized.

## Keyboard shortcuts

- Open popup: `Alt + Shift + K`
- Quick add current page: `Alt + Shift + S`

You can customize shortcuts in your browser extension settings.

## Local-first by default

CamKeeper stores profile data and settings in browser extension storage on your device.
Optional Nostr sync is disabled by default and can be enabled in Settings if you want multi-device sync.
When enabled, encrypted payloads are sent only to relays you configure.

Read the full policy here: [Privacy Policy](/privacy/)

Need help? Visit [Support](/support/)
