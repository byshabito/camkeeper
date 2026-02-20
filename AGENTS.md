# Repository Guidelines

## Project Structure
- `src/` is extension runtime code.
- `src/entries/` contains entry points for `background/`, `popup/`, and `options/`.
- `src/background/` handles service-worker orchestration and visit tracking.
- `src/domain/` contains business rules, models, normalizers, and use cases.
- `src/domain/useCases/` is the workflow layer consumed by UI/background.
- `src/domain/services/` contains domain-facing adapters.
- `src/domain/appService.js` is the main facade for UI/background.
- `src/repo/` contains storage and Nostr transport implementations.
- `src/repo/db.js` is the central `chrome.storage` wrapper.
- `src/ui/` contains controllers, components, selectors, and UI state.
- `src/styles/common.css` contains shared tokens and control patterns.
- `src/vendor/` contains vendored third-party runtime code.
- `icons/` contains extension icons referenced by manifests.
- `manifest.json` and `manifest.firefox.json` define browser packages.
- `docs/` contains the VitePress docs site.
- `dist/` is generated output from release packaging; never edit manually.

## Build, Lint, and Test Commands

### Install
- `bun install`
- Note: `package.json` currently includes docs scripts only.

### Docs
- Dev server: `bun run docs:dev`
- Build docs: `bun run docs:build`
- Preview build: `bun run docs:preview`

### Release Packaging
- `./build-release.sh <version>`
- Example: `./build-release.sh 1.1.0`
- Requires: `bash`, `python3` (or `python`), and `zip`.
- Updates version fields in both manifests.

### Linting and Syntax Checks
- No dedicated linter is configured.
- Do not add lint tooling without explicit project agreement.
- Recommended per-file syntax check: `node --check path/to/file.js`
- Run syntax checks for every changed JS file before PR.

### Testing
- No active automated test suite is configured.
- `npm test` / `bun test` are expected to fail unless tests are added.
- Single-test command is currently unavailable.
- If Bun tests are introduced later:
  - Run all tests: `bun test`
  - Run one test file: `bun test tests/path/to/file.test.js`

### Manual Verification Checklist
- Popup: create/edit/delete/merge profiles; verify search/sort/folder flows.
- Options: import/export, site settings edits, persistence, feedback toasts.
- Background: page detection and local view/session tracking behavior.
- Nostr sync (if touched): enable/disable, relay save, key save/clear, sync status.

## Code Style Guidelines

### Formatting
- Use 2-space indentation in JS/CSS/HTML/JSON.
- Use semicolons.
- Use double quotes for strings.
- Prefer trailing commas in multiline arrays/objects.
- Keep long expressions readable by splitting lines as needed.
- Preserve existing GPL headers at the top of JS files.

### Imports and Modules
- Use ES modules only (`import`/`export`).
- Keep imports at the top of files.
- Include `.js` in relative imports.
- Group imports consistently (external first, then internal).
- Prefer named exports.
- Avoid circular dependencies.
- Respect architecture direction: UI/background -> domain -> repo.

### Naming
- Variables/functions: `lowerCamelCase`.
- Constants: `SCREAMING_SNAKE_CASE`.
- Files/folders: follow existing `lowerCamelCase`/`kebab-case` style.
- Event handlers: prefer `handleX` or `onX` names.
- Avoid one-letter names except simple loop indices.

### Types and Data Contracts
- Project is plain JavaScript (no TypeScript).
- Keep object shapes explicit and stable across layers.
- Add JSDoc only for non-obvious contracts/public APIs.
- Reuse existing sanitizers/normalizers in `src/domain/`.
- Do not add transpilers or new build steps without agreement.

### Error Handling and Async
- Prefer early returns for invalid state.
- Guard `chrome.*` calls with feature checks/optional chaining.
- Wrap JSON parsing with safe fallbacks.
- Avoid throwing in user-facing popup/options flows unless surfaced clearly.
- Always `await` async operations that affect flow/state.
- Log actionable warnings only; never log secrets.

### Architecture Boundaries
- Keep business rules in `src/domain/`.
- UI/background should consume domain use cases via `src/domain/appService.js`.
- Persist only through repo modules (`src/repo/*`).
- Keep `src/repo/` focused on IO/storage/transport concerns.
- Keep pure logic separate from browser-specific side effects.
- Avoid mutating shared state outside dedicated state/store modules.

### UI, DOM, and CSS
- Cache/reuse frequently accessed DOM nodes.
- Prefer `textContent` over `innerHTML` unless HTML injection is intentional and safe.
- Use `classList` for visibility/style toggles.
- Keep selectors stable and straightforward.
- Preserve keyboard navigation and focus behavior.
- Reuse tokens and shared patterns from `src/styles/common.css`.
- Keep entry-specific styles in each entry's `styles.css`.

### Extension and Privacy Rules
- Background entry is a module service worker; avoid window-only APIs there.
- Use `chrome.runtime` messaging for cross-entry communication.
- Validate `chrome.tabs` fields before using URL/tab properties.
- Keep permission changes minimal and aligned in both manifests.
- Do not add analytics, telemetry, or tracking.
- Preserve local-first/offline-first behavior.
- Nostr sync must remain optional and disabled by default.
- Never log, export, import, or share private keys (`nsec`).

### Assets, Manifests, and Release Artifacts
- Store assets under `icons/` or the relevant entry folder.
- Update both manifests when metadata/permissions/assets change.
- Keep browser metadata aligned unless intentionally browser-specific.
- Never hand-edit `dist/` artifacts.
- Release bundles must include `LICENSE`, `README.md`, `CHANGELOG.md`, `PRIVACY.md`, and `THIRD_PARTY_NOTICES.md`.

## Docs Guidance
- Keep docs concise and practical for end users.
- Cross-link Nostr pages (`/nostr/`, `/privacy/`, `/support/`) when relevant.
- Keep `docs/changelog/index.md` in sync with root `CHANGELOG.md`.
- Run `bun run docs:build` after docs edits to validate rendering and links.

## Commit and Pull Request Guidance
- Use conventional prefixes: `feat`, `fix`, `docs`, `refactor`, `style`, `test`, `perf`, `build`, `ci`, `revert`.
- Keep commit messages concise and intent-focused.
- PRs should include scope, rationale, and manual verification steps.
- Include screenshots for user-visible UI changes when practical.

## Cursor and Copilot Rules
- No Cursor rules found:
  - `.cursor/rules/` does not exist.
  - `.cursorrules` does not exist.
- No Copilot rules found:
  - `.github/copilot-instructions.md` does not exist.
- If these files are added later, mirror relevant actionable rules here.
