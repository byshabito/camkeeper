<div align="center">
  <img src="/icons/icon-128.png" width="128" height="128" />
  <h1>CamKeeper</h1>
  <strong>Cross-site bookmark manager for Chaturbate and Stripchat models</strong>
  <br />
  <sub>Unify profiles, notes, and socials. Locally, privately, and without accounts.</sub>
</div>

## What it is

CamKeeper is a browser extension for users who follow many webcam models across multiple platforms.

It lets you create **one profile** for a model across multiple sites and social media platforms, and gives you tools to organize, annotate, and revisit them efficiently.

No accounts. No cloud. Everything stays in your browser.

## Features

### Unified profiles

- One profile per model, spanning **Chaturbate**, **Stripchat**, and socials
- Attach multiple platform usernames to the same profile
- Notes, tags, and social links per model

### Smart detection

- Auto-detect supported model pages
- Show the profile detail view automatically when visiting a saved model

### Organization & management

- Folder system with filtering
- Sort by name, last viewed, or last updated
- Bulk select to merge or delete profiles

### Activity & status (optional)

- Locally track time spent on saved model pages
- Optional online-status checks with badge count
- All activity data is stored only in your browser

### Privacy-first by design

- Local-only storage (no cloud, no sync)
- No user tracking, analytics, or data collection
- No remote servers or third-party services
- JSON export/import for backup or migration

## Usage

1. Visit a model page
2. Click the CamKeeper icon to save or attach it to a profile
3. Use folders, tags, and notes to organize
4. Instantly see saved details when you revisit the model

## Manual Installation

### Chrome / Chromium

1. Download `camkeeper-{{version}}-chrome.zip` from **Releases**
2. Extract the archive
3. Open `chrome://extensions`
4. Enable **Developer mode**
5. Click **Load unpacked** and select the extracted folder

### Firefox

1. Download `camkeeper-{{version}}-firefox.xpi`
2. Open `about:addons`
3. Go to **Extensions**
4. Click the gear icon → **Install Add-on From File…**
5. Select the `.xpi` file

> **Note (Firefox – advanced):**
> Some Firefox builds (e.g. Developer Edition, Nightly, or unsigned add-on setups)
> may require the following `about:config` settings for Manifest V3 extensions:
>
> - `xpinstall.signatures.required = false`
> - `extensions.manifestV3.enabled = true`
> - `extensions.backgroundServiceWorker.enabled = true`
>
> These changes are not required on standard Firefox release builds
> when installing a signed add-on.

## Data & privacy

- All data is stored locally in your browser
- Nothing is synced or transmitted
- You can export and import your data at any time

## Development notes

- Use `src/lib/repo/settings.js` for reading/updating settings so defaults stay normalized.
- Use `src/lib/repo/profiles.js` for profile reads/writes and view-history updates.
- Use `src/lib/repo/state.js` for background state storage.
- Domain helpers now live under `src/lib/domain/` (sanitizers, ids, urls, text, settings).
- Storage shims were removed; import domain helpers directly.
- Site definitions now live in `src/lib/domain/sites.js` (config re-exports it).

## Support

If CamKeeper saves you time or replaces a messy workflow, support its development:

[Buy Me a Coffee](https://www.buymeacoffee.com/shabito)

Bitcoin Lightning address:

```txt
shabito@walletofsatoshi.com
```

## License

[GPL-3.0](/LICENSE)
