# Vendored Dependencies

This directory contains third-party source files copied into the repository to avoid introducing a new build step for extension runtime code.

## Included

- `noble-secp256k1/index.js`
  - Source: `@noble/secp256k1@2.2.3`
  - License: MIT
  - Upstream: https://github.com/paulmillr/noble-secp256k1

- `bech32/index.js`
  - Source: `bech32@2.0.0` (bitcoinjs)
  - License: MIT
  - Upstream: https://github.com/bitcoinjs/bech32
  - Local adaptation: converted CommonJS exports to ESM exports
