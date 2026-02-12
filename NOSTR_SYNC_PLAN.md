# Nostr Sync Plan and Execution Checklist

## Scope and Principles

- Keep CamKeeper fully usable offline and local-first at all times.
- Keep Nostr sync optional and disabled by default.
- Encrypt all relay payloads.
- Persist `nsec` locally only and never include it in exports/imports.
- Keep sync code isolated from legacy online status logic and visit tracking flows.

## Phases

- [x] Phase 1 - Settings and state scaffolding
  - Add `nostrSync` defaults and normalization to domain settings.
  - Add dedicated state keys for local `nsec` and sync status.
  - Add app service/use-case plumbing for loading/updating sync config and local secret/status.

- [x] Phase 2 - Vendored Nostr dependencies and low-level adapters
  - Vendor audited ESM modules under `src/vendor`.
  - Add thin wrappers for key handling, event signing, relay URLs, and basic publish/query operations.
  - Keep vendored code isolated behind adapter modules.

- [x] Phase 3 - Encrypted NIP-78 payload codec
  - Implement envelope schema and versioning.
  - Implement encrypted encode/decode for profile payloads and tombstones.
  - Introduce opaque address generation for per-profile `d` tags.

- [x] Phase 4 - Sync orchestration and conflict handling
  - Implement manual sync use-case (pull -> merge -> push).
  - Implement deterministic conflict resolution and deletion tombstones.
  - Track sync status metadata and error state for UI.

- [x] Phase 5 - Options UI integration
  - Add Nostr Sync panel in options page.
  - Add enable toggle, relay management, local `nsec` set/clear, and manual `Sync now` action.
  - Surface sync status and errors without exposing sensitive material.

- [x] Phase 6 - Privacy/docs release updates
  - Update `README.md`, `PRIVACY.md`, and `CHANGELOG.md`.
  - Document encrypted payload behavior and remaining metadata exposure (relay sees IP/pubkey/timing).
  - Add third-party notice for vendored dependencies.

## Manual Validation Checklist

- [ ] Fresh install defaults to sync disabled and no relay traffic.
- [ ] Core profile workflows remain fully functional offline.
- [ ] Local saves succeed even when relays are unreachable.
- [ ] Two-device sync handles create/update/delete deterministically.
- [ ] Deletion tombstones prevent stale remote reappearance.
- [ ] Backup export/import excludes local `nsec` and sync secrets.
