# Remote Social Metadata Plan

## Goal

Support social platforms via remotely hosted metadata (label, icon, URL/parsing rules) so the extension can add platforms without bundling platform-specific code for every service.

## Recommendation

- Host metadata on GitHub Pages (not Gist).
- Use one stable endpoint for the latest registry and versioned snapshots for rollback.

Suggested base URL:

- `https://byshabito.github.io/camkeeper-socials/`

Suggested files:

- `latest/socials.json`
- `v1/socials-YYYY-MM-DD.json`
- `icons/*.svg`

Extension fetch target:

- `https://byshabito.github.io/camkeeper-socials/latest/socials.json`

## Registry Format (v1)

```json
{
  "version": 1,
  "updatedAt": "2026-02-07T12:00:00Z",
  "ttlHours": 24,
  "platforms": [
    {
      "id": "instagram",
      "label": "Instagram",
      "iconUrl": "https://byshabito.github.io/camkeeper-socials/icons/instagram.svg",
      "urlTemplate": "https://instagram.com/{handle}",
      "hosts": ["instagram.com"],
      "parseRules": [
        {
          "type": "firstPathSegment",
          "exclude": ["p", "reel", "tv", "explore", "accounts", "tags"]
        },
        {
          "type": "storiesSecondSegment"
        }
      ]
    }
  ]
}
```

## Safety Rules

- Treat remote data as declarative config only; never execute remote code.
- Validate schema strictly before use.
- Allow only `https://` icon URLs from trusted host allowlist.
- Enforce size/time limits for fetches.
- If remote is invalid/unavailable, fallback to bundled defaults.

## Runtime Strategy

1. Load bundled social defaults immediately.
2. Fetch remote registry in background.
3. Validate and cache (`registry`, `fetchedAt`, optional `etag`) with TTL.
4. Merge remote + local defaults.
5. Refresh social dropdown/icons after remote load.
6. If fetch fails, continue with cached or bundled defaults.

## Extension Architecture Plan

### Domain Layer

- Add `socialRegistry` service under `src/domain/services/`:
  - `getSocialRegistry()`
  - `refreshSocialRegistry()`
  - `getCachedSocialRegistry()`
- Add pure helpers under `src/domain/` for:
  - registry normalization/validation
  - URL building from `urlTemplate`
  - URL parsing from declarative `parseRules`

### UI Layer

- Replace static social options source with registry-backed options.
- Keep UI non-blocking (render defaults first, then refresh).
- Use remote icons via existing icon cache pipeline (with validation).

### Repo Layer

- Store registry cache and metadata in extension storage (new keys in `src/repo/db.js` helpers).

## Files Likely To Change

- `src/domain/socialOptions.js`
- `src/domain/urls.js`
- `src/domain/appService.js`
- `src/ui/controllers/popupController.js`
- `src/ui/services/iconCache.js`
- `manifest.json`
- `manifest.firefox.json`
- `README.md`
- `PRIVACY.md`
- `CHANGELOG.md`

## Rollout Plan

### Phase 1

- Remote metadata for label/icon/url building.
- Keep existing parse switch-case logic as fallback.

### Phase 2

- Registry-driven URL parsing for additional socials (e.g., OnlyFans/Fansly).

### Phase 3

- Optional settings view: metadata source/status and last refresh time.

## Privacy and Store Compliance

- Update privacy policy to disclose metadata fetch endpoint.
- Clarify that no user profile data is sent during metadata fetch.
- Keep analytics/telemetry disabled.
