<div align="center">
  <img src="/icons/icon-256.png" width="256" height="256" />
  <h1>CamKeeper</h1>
  <p>
    <strong>Cross-site creator profile manager</strong>
  </p>
  <p>
    <a href="https://chromewebstore.google.com/detail/camkeeper/plgibmbnfodgifhdggcnbihloihiafep/">Chrome Web Store</a>
    • <a href="https://addons.mozilla.org/firefox/addon/camkeeper/">Firefox Add-Ons</a>
  </p>
  <p>
    <a href="https://byshabito.github.io/camkeeper/">Documentation</a>
  </p>
  <!---
  <p>
    <img alt="Mozilla Add-on Users" src="https://img.shields.io/amo/users/camkeeper?style=flat&logo=firefoxbrowser&color=%23FF7139">
    <img alt="Mozilla Add-on Stars" src="https://img.shields.io/amo/stars/camkeeper?style=flat&logo=firefoxbrowser&color=%23FF7139"><br/>
    <img alt="Chrome Web Store Users" src="https://img.shields.io/chrome-web-store/users/plgibmbnfodgifhdggcnbihloihiafep?style=flat&logo=chromewebstore&color=%234285F4">
    <img alt="Chrome Web Store Stars" src="https://img.shields.io/chrome-web-store/stars/plgibmbnfodgifhdggcnbihloihiafep?style=flat&logo=chromewebstore&color=%234285F4">
  </p>
  --->
</div>
<br/>

CamKeeper is a browser extension that helps you organize and manage creator profiles you save across multiple platforms.

It allows you to create a single local profile that can reference multiple usernames or pages on different platforms, making it easier to keep notes, links, and metadata in one place.

No account is required. CamKeeper works fully local and offline by default, with optional Nostr sync if you choose to enable it.

## Features

### Unified profiles

- One local profile can reference multiple sites
- Attach multiple usernames or URLs to a single profile
- Add notes, tags, and external links

### Page detection

- Detects supported pages automatically (configurable in settings)
- Default support for Twitch and YouTube
- Customize site labels, abbreviations, and colors in settings
- Shows saved profile details when revisiting a known page

### Organization & management

- Folder-based organization with filtering
- Sorting by name, view time, or last updated
- Bulk actions for merging or deleting profiles

### Local activity indicators

- Local tracking of view time for saved livestream pages
- All activity data is stored only in the browser

### Optional Nostr sync

- Optional Nostr sync is disabled by default
- Uses encrypted NIP-78 payloads and local private key signing
- Stores your sync key (`nsec`) in browser extension storage on your local device
- Uses user-configured relays only; no CamKeeper backend service
- Manual sync flow is available from Options

#### What is Nostr?

Nostr is an open relay-based protocol for publishing and reading signed events.
In CamKeeper, it is used only as an optional transport layer to sync encrypted profile data across your devices.

#### Important key safety (`nsec`)

- Your `nsec` is your private key and controls your Nostr identity
- Never share it with anyone
- Do not send it in issues, screenshots, logs, email, or chat
- CamKeeper maintainers and support should never ask for it, and you should never share it even with them

### Privacy-first design

- Local-first storage with optional sync disabled by default
- No analytics, tracking, or telemetry
- No CamKeeper-managed servers or third-party tracking services
- Optional JSON export/import for backup or migration

## Usage

1. Visit a supported creator profile page
2. Click the CamKeeper extension icon to save or attach it to a profile
3. Organize profiles using folders, tags, and notes
4. View saved details automatically when revisiting pages

### Keyboard shortcuts

- Open popup: `Alt + Shift + K`
- Quick add current page: `Alt + Shift + S`

Shortcuts can be customized in the browser's extension settings.

## Installation

Get it from the official Chrome or Firefox stores:

- [Add to Chrome](https://chromewebstore.google.com/detail/camkeeper/plgibmbnfodgifhdggcnbihloihiafep/)
- [Add to Firefox](https://addons.mozilla.org/firefox/addon/camkeeper/)

<details>
<summary>Manual installation</summary>

#### Chrome / Chromium

1. Download `camkeeper-{{version}}-chrome.zip` from [Releases](https://github.com/byshabito/camkeeper/releases/latest)
2. Extract the archive
3. Open `chrome://extensions`
4. Enable **Developer mode**
5. Click **Load unpacked** and select the extracted folder

#### Firefox

1. Download `camkeeper-{{version}}-firefox.zip` from [Releases](https://github.com/byshabito/camkeeper/releases/latest)
2. Open `about:addons`
3. Go to **Extensions**
4. Click the gear icon and select **Install Add-on From File…**
5. Select the `.zip` file

**Note**: You may require the following `about:config` settings for Manifest V3 extensions:

- `xpinstall.signatures.required = false`
- `extensions.manifestV3.enabled = true`
- `extensions.backgroundServiceWorker.enabled = true`

These changes are not required on standard Firefox release builds when installing a signed add-on.

</details>

## Development (unpacked)

To load a local unpacked build in Chrome with bundled runtime modules:

1. Run `bun run dev:unpacked`
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** and select `dist/unpacked-chrome`

For Firefox, run `bun run dev:unpacked:firefox` and load `dist/unpacked-firefox`.

## Data & privacy

- All profile data is stored locally in the browser by default
- If optional Nostr sync is enabled, encrypted payloads are sent to user-configured relays
- Relay operators can still observe network metadata (for example IP, public key, and timing)
- Your private key (`nsec`) must stay secret and must never be shared with anyone
- Data can be exported or imported at any time

See [PRIVACY](/PRIVACY.md) for full details.

## License

[GPL-3.0-or-later](/LICENSE)

## Third-party notices

See [THIRD_PARTY_NOTICES](/THIRD_PARTY_NOTICES.md).
