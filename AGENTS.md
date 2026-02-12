# Repository Guidelines

## Project Structure and Module Organization
- `src/` contains extension source code.
- `src/entries/` contains entry points for `background/`, `popup/`, and `options/`.
- `src/background/` contains service-worker orchestration and visit tracking.
- `src/domain/` contains business logic, sanitizers, models, and use-cases.
- `src/domain/useCases/` contains workflows consumed by UI/background.
- `src/domain/services/` contains domain-facing store adapters.
- `src/domain/appService.js` is the main facade for entry/UI modules.
- `src/repo/` contains storage and Nostr transport adapters.
- `src/repo/db.js` is the central `chrome.storage` wrapper.
- `src/ui/` contains controllers, components, selectors, and state modules.
- `src/styles/common.css` holds shared CSS variables/utilities.
- `icons/` contains assets referenced by manifests.
- `manifest.json` and `manifest.firefox.json` define browser packages.
- `docs/` contains the VitePress docs site.
- `dist/` is release output from `build-release.sh`; do not edit manually.
- `src/vendor/` stores vendored dependencies; keep notices in sync.

## Build, Lint, and Test Commands
Dependency install:
- `bun install`
Docs:
- Dev server: `bun run docs:dev`
- Build docs: `bun run docs:build`
- Preview docs: `bun run docs:preview`
Release packaging:
- `./build-release.sh <version>`
- Example: `./build-release.sh 1.1.0`
- Requires `bash`, `python3` (or `python`), and `zip`.
- Updates both manifests and stamps `RELEASE_TIMESTAMP` in options metadata.
Linting:
- No dedicated linter is configured.
- Do not introduce lint tooling without explicit project agreement.
Syntax checks (recommended before PR):
- Single file: `node --check src/entries/popup/script.js`
- Repeat for each changed JS file.
Testing:
- No active automated test suite currently exists.
- Single-test command is unavailable while no test runner is configured.
- If tests are reintroduced with Bun:
  - Run all tests: `bun test`
  - Run one test file: `bun test tests/path/to/file.test.js`
Manual verification (required for feature work):
- Popup: create/edit/delete/merge profiles and verify search/sort/folders.
- Options: import/export, site settings, persistence, and validation feedback.
- Background: page detection and visit/session tracking behavior.
- Nostr sync (if touched): enable/disable, relays, key handling, manual sync.

## Code Style Guidelines
### Formatting
- Use 2-space indentation in JS/CSS/HTML/JSON.
- Use semicolons.
- Use double quotes for strings.
- Prefer trailing commas in multiline arrays/objects.
- Keep long expressions readable by splitting lines.
- Preserve the existing GPL header block at top of JS files.
### Imports and Modules
- Use ES modules only (`import` / `export`).
- Keep imports at the top of files.
- Include `.js` extension in relative imports.
- Group imports consistently (external first, then internal).
- Prefer named exports over default exports.
- Avoid circular dependencies.
- Keep architecture direction clear: UI/background -> domain -> repo.
### Naming
- Variables and functions: `lowerCamelCase`.
- Constants: `SCREAMING_SNAKE_CASE`.
- Files/directories: follow current style (`lowerCamelCase` or `kebab-case`).
- Event handlers: prefer `handleX` or `onX`.
- Avoid one-letter names except simple loop counters.
### Types and Data Contracts
- Project is plain JavaScript (no TypeScript).
- Keep object shapes explicit and stable across modules.
- Add JSDoc only for non-obvious contracts/public APIs.
- Reuse domain sanitizers/normalizers instead of ad-hoc cleanup.
- Do not add new transpile/build steps without agreement.
### Error Handling and Async
- Prefer early returns for invalid state.
- Guard `chrome.*` APIs with feature checks/optional chaining.
- Wrap JSON parsing and fall back safely.
- Avoid throwing in popup/background user flows unless surfaced clearly.
- `await` async operations and provide fallback behavior.
- Log useful warnings only; never log secrets.
### Architecture Boundaries
- Keep business logic inside `src/domain/`.
- UI/background should call use-cases through `src/domain/appService.js`.
- Persist via repo modules (`src/repo/*`), not direct ad-hoc storage.
- Keep `src/repo/` focused on IO/storage adapters.
- Keep pure logic separate from browser-specific side effects.
- Avoid mutating shared state outside dedicated state/store modules.
### UI and DOM
- Cache/reuse DOM references when repeatedly accessed.
- Prefer `textContent` over `innerHTML` unless HTML is intentional/safe.
- Use `classList` for style/visibility toggles.
- Keep selectors stable and simple.
- Preserve keyboard navigation and focus behavior.
### CSS and Visual Consistency
- Use shared variables/utilities from `src/styles/common.css`.
- Keep entry-specific styles in each entry `styles.css`.
- Reuse existing button/chip/card styles before adding new patterns.
- Keep visual changes consistent with existing extension language.
### Browser Extension and Privacy
- Background entry is a module service worker; avoid window-only APIs there.
- Use `chrome.runtime` messaging for cross-entry communication.
- Validate `chrome.tabs` results before using URLs/tab data.
- Keep permission changes minimal and aligned across both manifests.
- Do not add analytics, telemetry, or tracking.
- Preserve local-first/offline-first behavior.
- For Nostr sync changes: keep sync optional and disabled by default.
- Never log, export, import, or share private keys (`nsec`).
### Assets, Manifests, and Releases
- Store assets in `icons/` or entry folders.
- Update both manifests when changing permissions, commands, or assets.
- Keep browser metadata aligned unless intentionally browser-specific.
- Never edit `dist/` artifacts manually.
- Ensure release bundles include `LICENSE`, `README.md`, `CHANGELOG.md`, `PRIVACY.md`, and `THIRD_PARTY_NOTICES.md`.

## Commit and Pull Request Guidance
- Use conventional prefixes: `feat`, `fix`, `docs`, `refactor`, `style`, `test`, `perf`, `build`, `ci`, `revert`.
- Keep commit messages concise and intent-focused.
- PRs should include changed scope, rationale, and manual verification steps.
- Include screenshots for UI-facing changes when practical.

## Cursor and Copilot Rules
- No Cursor rules found:
  - `.cursor/rules/` does not exist.
  - `.cursorrules` does not exist.
- No Copilot instructions found:
  - `.github/copilot-instructions.md` does not exist.
- If these files are added later, mirror their actionable rules here.

## Agent Working Notes
- Prefer small, focused edits that respect existing module boundaries.
- Keep browser behavior aligned across `manifest.json` and `manifest.firefox.json`.
- Treat `dist/` as generated output only.
- Preserve local-first behavior in all feature changes.
- When touching Nostr paths, keep sync optional and key handling private.
- Before handoff, run syntax checks on changed JS files.

## Quick Reference
- Background entry: `src/entries/background/index.js`
- Popup entry: `src/entries/popup/script.js`
- Options entry: `src/entries/options/script.js`
- Domain facade: `src/domain/appService.js`
- Storage wrapper: `src/repo/db.js`
- Release script: `./build-release.sh`
