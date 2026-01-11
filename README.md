<div align="center">
  <img src="/icons/icon-128.png" width="128" height="128" />
  <h1>CamKeeper</h1>
  <strong>Cross-site livestream profile and bookmark manager</strong>
</div>

CamKeeper is a browser extension that helps you organize and manage livestream profiles they follow across multiple websites.

It allows you to create a single local profile that can reference multiple usernames or pages on different platforms, making it easier to keep notes, links, and metadata in one place.

No accounts. No cloud services. All data remains on your device.

## Features

### Unified profiles

- One local profile can reference multiple sites
- Attach multiple usernames or URLs to a single profile
- Add notes, tags, and external links

### Page detection

- Detects supported pages automatically
- Shows saved profile details when revisiting a known page

### Organization & management

- Folder-based organization with filtering
- Sorting by name, viewed, or last updated
- Bulk actions for merging or deleting profiles

### Local activity indicators

- Local tracking of visits to saved pages
- All activity data is stored only in the browser

### Privacy-first design

- Local-only storage (no accounts, no sync)
- No analytics, tracking, or telemetry
- No external servers or third-party services
- Optional JSON export/import for backup or migration

## Usage

1. Visit a supported profile page
2. Click the CamKeeper extension icon to save or attach it to a profile
3. Organize profiles using folders, tags, and notes
4. View saved details automatically when revisiting pages

### Keyboard shortcuts

- Open popup: `Alt + Shift + K`
- Save current page: `Alt + Shift + S`

Shortcuts can be customized in the browser's extension settings.

## Installation

<!---
### Chrome / Chromium

- Install from the Chrome Web Store

### Firefox

- Install from Firefox Add-ons (AMO)
--->

<details>
<summary>Manual installation (development / testing)</summary>

#### Chrome / Chromium

1. Download `camkeeper-{{version}}-chrome.zip` from **Releases**
2. Extract the archive
3. Open `chrome://extensions`
4. Enable **Developer mode**
5. Click **Load unpacked** and select the extracted folder

#### Firefox

1. Download `camkeeper-{{version}}-firefox.xpi`
2. Open `about:addons`
3. Go to **Extensions**
4. Click the gear icon → **Install Add-on From File…**
5. Select the `.xpi` file

**Note**: Some Firefox builds (e.g. Developer Edition, Nightly, or unsigned add-on setups) may require the following `about:config` settings for Manifest V3 extensions:

- `xpinstall.signatures.required = false`
- `extensions.manifestV3.enabled = true`
- `extensions.backgroundServiceWorker.enabled = true`

These changes are not required on standard Firefox release builds when installing a signed add-on.
</details>

## Data & privacy

- All data is stored locally in the browser
- No data is transmitted or shared
- Data can be exported or imported at any time

See [PRIVACY](/PRIVACY.md) for full details.

## License

[GPL-3.0-or-later](/LICENSE)
