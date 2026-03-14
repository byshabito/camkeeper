# Changelog

## v1.1.1

- Canonicalize unsupported and legacy social platform values from `other` to `website`, making Website the fallback type across sanitization and selector formatting.
- Add persistence-time normalization and storage migration coverage so previously saved fallback socials are rewritten to `website` on load/save paths.
- Replace Nostr dirty detection based only on profile `updatedAt` with a dedicated local mutation ledger that also tracks view-time-only profile updates.
- Harden Nostr pull/merge resolution so older remote payloads cannot overwrite newer local mutations, and remote winners do not get re-flagged as fresh local dirty state.
- Bootstrap a one-time republish of current local profiles after the change-tracking rollout so previously missed local edits are published.
- Sync the livestream site registry over encrypted Nostr settings payloads with whole-list last-write-wins behavior and immediate settings UI refresh after newer remote site data is applied.
- Store the derived local `npub` beside the saved `nsec`, and backfill missing `npub` values for older saved secrets to aid debugging.
- Remove outer popup scroll padding so the scrolling list stays flush with the intended layout.

## v1.1.0

- Add optional NIP-78-based Nostr sync with encrypted payloads and privacy-preserving opaque coordinates while preserving local-first/offline behavior when sync is disabled or relays fail.
- Implement explicit manual "Pull now" and "Push now" flows, including split pull/merge behavior and push-only publishing controls.
- Add Nostr sync configuration to Options with enablement, relay management, saved-key handling, generated local `nsec` keys, and persisted sync status.
- Seed sync setup with three default relays and add one-click local key generation.
- Vendor audited Nostr cryptography/runtime dependencies and replace custom relay/signing primitives with `nostr-tools`.
- Refine sync setup UX with clearer status placement, disabled actions until setup is complete, stronger relay validation feedback, and masked private-key handling.
- Replace the Settings About block with a compact footnote row that links to docs, changelog, privacy, and support pages.
- Remove build-time metadata from Settings and stop release-script timestamp stamping in favor of version-only packaging metadata.
- Localize the Buy Me a Coffee badge asset and remove unused image assets to reduce packaged payload.
- Migrate profile persistence from `chrome.storage` to IndexedDB with one-time legacy import while preserving existing backup keys.
- Add migration/write-path debug logging behind a store-safe toggle plus optional background view-session debug logs with sensitive-state redaction.
- Introduce an esbuild-based extension bundling pipeline and package runtime-only files in release archives.

## v1.0.3

- Collapse the codebase into clearer `UI/background -> domain -> repo` layers.
- Move workflow orchestration into `src/domain/useCases` and add `src/domain/appService.js` as the main facade consumed by UI and background entries.
- Narrow repo modules to storage/transport responsibilities and remove test-only coupling from storage repositories.
- Sort the "add to existing profile" flow by most recently updated profiles first.
- Preserve imported creators from unsupported livestream sites in storage while hiding them from the UI until the site registry supports them.

## v1.0.2

- Preserve folder assignment when attaching a livestream identity to an existing profile.

## v1.0.1

- Add a configurable livestream site registry seeded with Twitch and YouTube defaults.
- Remove adult platform references and the old fixed host-permission model.

## v1.0.0

- Refresh placeholder tags used in profile editing flows.
- Add a quick-add command for saving the current creator page.
- Surface confirmation feedback for the quick-add shortcut.
- Add a keyboard shortcut for opening the popup.

## v0.9.0

- Remove online-status checks and the related context menu library shortcut from the product surface.
- Continue architectural cleanup while moving Settings out of the popup into the dedicated options page, keeping the popup settings button as a shortcut.
- Fix backup import confirmation flow and include timestamps in exported backup filenames.
- Add a configurable view-time metric (focus sessions vs page sessions) and default it to livestream-open tracking.
- Remove the user-facing debug logs setting.
- Tighten settings/About copy, update license text, and strengthen primary-button hover contrast.
- Remove the explicit Save button and persist settings automatically when values change.
- Add privacy policy documentation and remove Reddit from supported socials.

## v0.8.4

- Rename bookmark-oriented UI/data terminology to profiles, including backup naming.
- Normalize website socials more aggressively and improve URL matching for social detail views.
- Default online-status checks to disabled with a 5-minute refresh interval.
- Clarify backup/configuration labels and fix attaching a new livestream username to an existing profile.
- Add multi-size favicons to the popup and options pages.

## v0.8.3

- Shorten the folder filter label to "All" and split backup tooling into dedicated download/import rows.
- Rename settings sections to Configuration and About.
- Add Bitcoin donation UI with copyable Lightning, LNURL, and on-chain values.
- Tweak backup import copy and floating success feedback.

## v0.8.2

- Add manual drag-and-drop ordering for folders.
- Persist custom folder order across list, filter, and editor state.
- Add a drag handle and tighten the folder manager layout.

## v0.8.1

- Refresh icon assets and adjust CK logo sizing.

## v0.8.0

- Add a "most viewed (30 days)" sort backed by rolling daily view-history buckets.
- Persist the last selected sort and folder filter in popup state.
- Add a filter for currently online creators.
- Hide the online filter when online checks are disabled and keep it live-updated.

## v0.7.0

- Embed the settings view inside the popup while keeping the options page shell.

## v0.6.4

- Rename remaining platform terminology to livestream terminology.

## v0.6.3

- Persist active view-session state so MV3 background suspends do not lose in-progress timing data.

## v0.6.2

- Remove the unused background command listener when commands are not configured.
- Rename the settings metadata label to "Build time".

## v0.6.1

- Add `homepage_url` to the manifest metadata.
- Remove command definitions from the extension manifest.

## v0.6.0

- Centralize storage access behind a unified API layer.
- Add shared online-status API modules and background configuration defaults.
- Refactor background behavior into more modular services.
- Default new or unfiled profiles to the "No folder" selector state.
- Replace visit counting with active view-time tracking.
- Sort platform chips by most-viewed first.
- Expand supported socials and auto-detect matching social profiles.
- Refresh popup layout and icon styling, and replace textual back labels with icon buttons.

## v0.5.1

- Switch the livestream status endpoint and update parsing for the replacement response format.

## v0.5.0

- Add extension metadata to the settings page.
- Add a background online-check toggle and badge-count integration.

## v0.4.2

- Preserve pinned and online stats when editing profiles.
- Add the Buy Me a Coffee sponsor link.

## v0.4.1

- Move online checks to popup-open execution with cooldown-based throttling instead of background polling.

## v0.4.0

- Add background online-status checks.
- Add settings to enable checks and control the polling interval.

## v0.3.0

- Add folder organization with filter and manager flows.
- Add folder selection and inline new-folder creation in add/edit flows.
- Refine popup layout, titles, and search interactions.

## v0.2.3

- Fix the Firefox manifest version metadata.

## v0.2.2

- Add pinned profiles and update sorting to prioritize pinned entries.
- Refine the popup search/sort row with icon-triggered search behavior.
- Make the settings page settings-only.
- Add online/offline styling support for platform chips.

## v0.2.1

- Split Chrome and Firefox manifests and add build-script support for separate packages.
- Add store-ready icon sizes (`16/32/48/128/256`).

## v0.2.0

- Add visit tracking with configurable focus-time and cooldown thresholds.
- Extend sorting with `updated`, `name`, and `visits` modes.
- Add settings-library tooling with modal add/edit flows and backup import/export.
- Add bulk merge/delete actions from settings.

## v0.1.0

- Introduce multi-platform creator profiles with notes, tags, and social links.
- Add URL parsing for platform/social inputs and auto-open detail view on recognized saved creator pages.
- Support attaching the current platform to an existing profile and bulk merge/delete flows.
- Start with local-only storage plus JSON export/import backups.
- Ship Chrome and Firefox support, including the fallback library shortcut.
