# Repository Guidelines

## Project Structure and Module Organization
- `src/` contains extension runtime source code.
- `src/entries/` contains entry points for `background/`, `popup/`, and `options/`.
- `src/background/` contains service-worker orchestration and visit tracking.
- `src/domain/` contains business logic, normalization, models, and use-cases.
- `src/domain/useCases/` contains user workflows consumed by UI/background.
- `src/domain/services/` contains domain-facing adapters.
- `src/domain/appService.js` is the primary facade used by UI/background layers.
- `src/repo/` contains storage and Nostr transport implementations.
- `src/repo/db.js` is the central `chrome.storage` wrapper.
- `src/ui/` contains controllers, components, selectors, and state.
- `src/styles/common.css` contains shared style tokens and button/input patterns.
- `icons/` contains manifest-referenced extension icons.
- `manifest.json` and `manifest.firefox.json` define browser-specific packages.
- `docs/` contains the VitePress site.
- `docs/nostr/index.md` is the Nostr learning guide.
- `docs/changelog/index.md` mirrors release history for docs readers.
- `dist/` is generated release output from the build script; do not edit.
- `src/vendor/` stores vendored third-party code; keep notices in sync.

## Build, Lint, and Test Commands
Install dependencies (docs tooling):
- `bun install`

Docs:
- Dev server: `bun run docs:dev`
- Build docs: `bun run docs:build`
- Preview built docs: `bun run docs:preview`

Release packaging:
- `./build-release.sh <version>`
- Example: `./build-release.sh 1.1.0`
- Requires: `bash`, `python3` (or `python`), and `zip`.
- Updates both manifests and stamps `RELEASE_TIMESTAMP`.

Linting:
- No dedicated linter is currently configured.
- Do not add lint tooling without explicit project agreement.

Syntax checks (recommended before PR):
- Single file: `node --check src/ui/components/settingsPanel.js`
- Run for every changed JS file.

Testing:
- No active automated test suite is configured right now.
- Single-test command is unavailable until a runner is added.
- If Bun tests are added later:
  - Run all tests: `bun test`
  - Run one test file: `bun test tests/path/to/file.test.js`

Manual verification checklist:
- Popup: create/edit/delete/merge profiles and verify search/sort/folder flows.
- Options: import/export, site settings edits, persistence, feedback toasts.
- Background: page detection and local view/session tracking behavior.
- Nostr sync (if touched): enable/disable, relay save, key save/clear, sync status.

## Code Style Guidelines

### Formatting
- Use 2-space indentation in JS/CSS/HTML/JSON.
- Use semicolons.
- Use double quotes for strings.
- Prefer trailing commas in multiline arrays/objects.
- Keep long expressions readable; split lines as needed.
- Preserve existing GPL header blocks at top of JS files.

### Imports and Modules
- Use ES modules only (`import` / `export`).
- Keep imports at file top.
- Include `.js` in relative imports.
- Group imports consistently (external first, then internal).
- Prefer named exports over default exports.
- Avoid circular dependencies.
- Respect architecture flow: UI/background -> domain -> repo.

### Naming
- Variables/functions: `lowerCamelCase`.
- Constants: `SCREAMING_SNAKE_CASE`.
- Files/folders: follow existing style (`lowerCamelCase` or `kebab-case`).
- Event handlers: prefer `handleX` or `onX`.
- Avoid one-letter names except simple loop indices.

### Types and Data Contracts
- Project is plain JavaScript (no TypeScript).
- Keep object shapes explicit and stable across layers.
- Add JSDoc only for non-obvious contracts/public APIs.
- Reuse existing sanitizers/normalizers in `src/domain/`.
- Do not add transpilers/new build steps without agreement.

### Error Handling and Async
- Prefer early returns for invalid state.
- Guard `chrome.*` calls with feature checks/optional chaining.
- Wrap JSON parsing and provide safe fallbacks.
- Avoid throwing in user-facing popup/options flows unless surfaced clearly.
- `await` async operations and keep graceful fallback behavior.
- Log useful warnings only; never log secrets.

### Architecture Boundaries
- Keep business rules in `src/domain/`.
- UI/background should call use-cases via `src/domain/appService.js`.
- Persist through repo modules (`src/repo/*`), not ad-hoc storage calls.
- Keep `src/repo/` focused on IO/storage/transport concerns.
- Keep pure logic separate from browser-specific side effects.
- Avoid mutating shared state outside dedicated state/store modules.

### UI and DOM
- Cache/reuse DOM nodes accessed repeatedly.
- Prefer `textContent` over `innerHTML` unless HTML injection is intentional and safe.
- Use `classList` for visibility/style toggles.
- Keep selectors stable and straightforward.
- Preserve keyboard navigation and focus behavior.

### CSS and Visual Consistency
- Reuse tokens and shared patterns from `src/styles/common.css`.
- Keep entry-specific styles in each entry `styles.css`.
- Reuse existing button/chip/card patterns before adding new variants.
- Keep layout changes consistent with existing options/popup visual language.

### Browser Extension and Privacy Rules
- Background entry is a module service worker; avoid window-only APIs there.
- Use `chrome.runtime` messaging for cross-entry communication.
- Validate `chrome.tabs` fields before using URL/tab properties.
- Keep permission changes minimal and aligned in both manifests.
- Do not add analytics, telemetry, or tracking.
- Preserve local-first/offline-first behavior.
- For Nostr changes: keep sync optional and disabled by default.
- Never log, export, import, or share private keys (`nsec`).

### Assets, Manifests, and Releases
- Store assets in `icons/` or relevant entry folders.
- Update both manifests when permissions/assets/metadata change.
- Keep browser metadata aligned unless intentionally browser-specific.
- Never edit generated `dist/` artifacts manually.
- Ensure release bundles include `LICENSE`, `README.md`, `CHANGELOG.md`, `PRIVACY.md`, and `THIRD_PARTY_NOTICES.md`.

## Docs Authoring Notes
- Keep docs pages concise and practical for end users.
- Cross-link Nostr-related pages (`/nostr/`, `/privacy/`, `/support/`) when relevant.
- Keep `docs/changelog/index.md` in sync with root `CHANGELOG.md`.
- After docs edits, run `bun run docs:build` to verify rendering and links.

## Commit and Pull Request Guidance
- Use conventional prefixes: `feat`, `fix`, `docs`, `refactor`, `style`, `test`, `perf`, `build`, `ci`, `revert`.
- Keep commit messages concise and intent-focused.
- PRs should include scope, rationale, and manual verification steps.
- Include screenshots for user-visible UI changes when practical.

## Cursor and Copilot Rules
- No Cursor rules found:
  - `.cursor/rules/` does not exist.
  - `.cursorrules` does not exist.
- No Copilot instructions found:
  - `.github/copilot-instructions.md` does not exist.
- If these files are added later, mirror relevant actionable rules here.
