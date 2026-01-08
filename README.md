<img src="/src/assets/camkeeper-logo.png" width="512px" height="512px" align="right"/>

# CamKeeper

Cross-site bookmark manager for Chaturbate and Stripchat models (Chrome + Firefox).

## Features

- Multi-platform profiles with notes, tags, and socials
- Smart URL parsing for platform/social inputs
- Auto detail view on saved model pages
- Add current platform to an existing profile
- Bulk select to merge or delete
- Sort by updated/name/visits
- Visit tracking with configurable focus time + cooldown
- Local-only storage with JSON export/import

## Usage

1. Visit a model page and click the extension icon
2. Add or attach the platform username to an existing profile
3. Use **Select** to merge or delete multiple bookmarks

Popup fallback (Zen or blocked popups): use `Alt+Shift+L` or right-click the icon → **Open CamKeeper Library**.

## Installation (Development)

### Chrome / Chromium

1. Clone this repo
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select this project folder

### Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `manifest.json` from this project

## Release Builds

Use the build script to create Chrome and Firefox zips with the correct manifests:

```bash
./scripts/build.sh 0.3.0
```

## License

[MIT License](/LICENSE)
