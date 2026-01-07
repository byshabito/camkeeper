# CamKeeper

Cross-site bookmark manager for Chaturbate and Stripchat models (Chrome + Firefox).

## Features

- One profile per model with multiple platform usernames
- Notes, tags, and social handles with smart URL parsing
- Detail view opens automatically on a saved model page
- Add current platform to an existing profile
- Bulk select + merge or delete in overview
- Local-only storage with JSON export/import

## Usage

### Quick add

1. Visit a model page
2. Click the extension icon
3. Add or attach the platform username to an existing profile

### Bulk merge/delete

1. Open the overview list
2. Click **Select** to enable multi-select
3. Tap cards to select, then **Merge** or **Delete**

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

## Release

1. Run `git tag v0.1.0`
2. Create a ZIP with `manifest.json`, `src/`, `icons/`, and `LICENSE`

## License

[MIT License](/LICENSE)
