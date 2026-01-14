# Repository Guidelines

## Project Structure & Module Organization

- `src/` contains the extension source.
- `src/entries/` holds entry points for `background/`, `popup/`, and `options/`.
- `src/lib/` provides shared utilities, domain logic (`domain/`), and repos (`repo/`).
- `src/lib/db.js` is the single storage wrapper for `chrome.storage`.
- `icons/` stores extension icons used by the manifest.
- `manifest.json` and `manifest.firefox.json` define Chrome/Firefox builds.
- `dist/` is created by the release build script and should not be edited.

## Build, Lint, and Test Commands

- Release build: `./build-release.sh <version>`
- Example: `./build-release.sh 1.0.0`
- Requirements: `bash`, `python`, and `zip` available on PATH.
- The script updates manifest versions and stamps `RELEASE_TIMESTAMP` in options UI.

Linting:
- No linting tool is configured.
- If you add one, document the command here.

Testing:
- No automated test runner is configured.
- Single-test command: not applicable.
- If you add tests, document how to run them here.

Manual dev install:
- Chrome: `chrome://extensions` → Developer mode → Load unpacked → repo root.
- Firefox: `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → `manifest.firefox.json`.

## Coding Style Guide

### Formatting

- Indentation: 2 spaces in JS/CSS/HTML.
- Semicolons are required.
- Use double quotes for strings.
- Prefer trailing commas in multiline objects/arrays.
- Keep lines readable; split long argument lists across lines.
- Keep existing GPL header blocks at the top of JS files.

### Imports and Modules

- Use ES modules (`import`/`export`), not CommonJS.
- Keep import statements at the top of the file.
- Include the `.js` extension in relative imports.
- Group imports: external first (if any), then internal relative imports.
- Prefer named exports to default exports.

### Naming Conventions

- Variables/functions: `lowerCamelCase`.
- Constants: `SCREAMING_SNAKE_CASE`.
- Files/directories: `lowerCamelCase` or `kebab-case` to match existing folders.
- Event handlers: `handleX` or `onX` prefixes.
- Avoid single-letter variables except for trivial indices.

### Types and Data Shapes

- The project is plain JavaScript (no TypeScript).
- Use clear object shapes and keep domain models consistent.
- If needed, add JSDoc for complex objects or public APIs.
- Do not introduce new build steps without agreement.

### Error Handling and Defensive Coding

- Prefer early returns for invalid state.
- Guard `chrome.*` APIs with optional chaining or feature checks.
- When parsing JSON, catch errors and return safe defaults.
- Avoid throwing in background/popup UI flows unless surfaced to the user.
- Keep async operations `await`ed and handle fallbacks gracefully.

### State, Storage, and Domain Boundaries

- Persisted data should go through `src/lib/db.js` or repo helpers.
- Keep domain logic inside `src/lib/domain/` where possible.
- UI and entry points should call repos or domain helpers, not raw storage.
- Keep configuration defaults in domain modules.

### UI and DOM Conventions

- Keep DOM queries scoped and cached when reused.
- Prefer `textContent` over `innerHTML` unless necessary.
- Use `classList` for toggling styles.
- Keep CSS selectors simple and stable.
- Preserve focus order and keyboard navigation.

### CSS and Theming

- Use the CSS variables in `src/styles/common.css` for colors.
- Keep shared styles in `src/styles/common.css`.
- Keep entry-specific styles in each entry `styles.css`.
- Reuse existing button, chip, and card classes when possible.

### Browser Extension Conventions

- Background entry is a module service worker; avoid window-specific APIs.
- Use `chrome.runtime` messaging for cross-entry communication.
- Validate `chrome.tabs` results before dereferencing URLs.
- Keep permission changes aligned across both manifests.
- Avoid long-lived timers in the background unless required.

### Data and Privacy Expectations

- Do not add analytics, telemetry, or third-party tracking.
- Keep user data local; avoid network calls without approval.
- Sanitize imported JSON and fallback to defaults on errors.
- Keep export/import flows resilient to missing fields.

### Assets and Manifests

- Store icons and assets in `icons/` or entry folders.
- Update both manifests when changing permissions or assets.
- Keep permissions minimal and aligned across browsers.
- Avoid adding third-party libraries unless necessary.
- Ensure new assets are referenced by HTML or manifests.

## Testing Guidelines

- No framework is configured; no coverage requirements are enforced.
- If you add tests, keep them lightweight and document execution.
- Include manual verification steps in PRs.

## Build and Release Notes

- Use `./build-release.sh` to bump versions and produce ZIPs.
- Do not edit `dist/` manually.
- `RELEASE_TIMESTAMP` is injected by the release script.

## Cursor/Copilot Rules

- No `.cursor/rules`, `.cursorrules`, or `.github/copilot-instructions.md` found.
- If new rules are added, mirror them here.

## Commit & Pull Request Guidelines

- Commit messages use a type prefix:
  - `feat`, `fix`, `docs`, `refactor`, `style`, `test`, `perf`, `build`, `ci`, `revert`.
- PRs include a concise summary and manual verification steps.
- For UI changes, include screenshots when practical.

## Notes

- Background entry point: `src/entries/background/index.js` (module service worker).
- Popup entry point: `src/entries/popup/index.js`.
- Options entry point: `src/entries/options/index.js`.
- Release metadata is injected by `./build-release.sh`.
