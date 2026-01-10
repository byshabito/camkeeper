<div align="center">
    <img src="/icons/icon-128.png" width="128px" height="128px" align="center"/>
    <h1>CamKeeper</h1>
    <strong>Cross-site profile manager for Chaturbate and Stripchat models</strong>
</div>

## Features

- Multi-platform profiles with notes, tags, and socials
- Smart URL parsing for platform/social inputs
- Auto detail view on saved model pages
- Add current platform to an existing profile
- Bulk select to merge or delete
- Folder organization with filtering and manager
- Sort by updated/name/viewed time
- Active view time tracking for model pages
- Optional online status checks and badge count
- Auto-detect social profile pages for quick detail view
- Local-only storage with JSON export/import

## Usage

1. Visit a model page and click the extension icon
2. Add or attach the platform username to an existing profile
3. Use **Select** to merge or delete multiple profiles

## Manual Installation

Download the latest release file for your browser from GitHub Releases (`*.zip` for Chrome/Chromium, `*.xpi` for Firefox).

### Chrome / Chromium

1. Extract the `camkeeper-{{version}}-chrome.zip`
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the unzipped folder that contains `manifest.json`

### Firefox

1. Open `about:addons`
2. Navigate to **Extensions**
3. Click the **gear icon** on the top right
4. Click on **Install Add-on From File...**
5. Select `camkeeper-{{version}}-firefox.xpi` file

Note: Some Firefox builds require allowing unsigned add-ons and enabling MV3 in `about:config`:

- `xpinstall.signatures.required = false`
- `extensions.manifestV3.enabled = true`
- `extensions.backgroundServiceWorker.enabled = true`

## Temporary Installation (Development)

1. Clone this repo

### Chrome / Chromium

2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select this project folder

### Firefox

2. Open `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on**
4. Select `manifest.firefox.json` from this project

## Support

If you like CamKeeper, consider supporting its development.

<a href="https://www.buymeacoffee.com/shabito" target="_blank">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" >
</a>

## License

[MIT License](/LICENSE)
