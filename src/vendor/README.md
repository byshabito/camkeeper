# Vendored Dependencies

CamKeeper now uses a bundling step for runtime JavaScript.

`src/vendor/` currently contains legacy snapshots kept for repository history only and is not part of the active Nostr runtime path.

Current Nostr runtime behavior is sourced from npm dependency bundles (notably `nostr-tools`) during the extension build pipeline.
