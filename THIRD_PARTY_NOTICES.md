# Third-Party Notices

This project vendors a small set of third-party libraries directly in source form under `src/vendor`.

## Included Dependencies

### noble-secp256k1

- Package: `@noble/secp256k1`
- Version: `2.2.3`
- License: MIT
- Copyright: Paul Miller
- Upstream: https://github.com/paulmillr/noble-secp256k1
- Vendored file: `src/vendor/noble-secp256k1/index.js`

### bech32

- Package: `bech32`
- Version: `2.0.0`
- License: MIT
- Copyright: bitcoinjs contributors
- Upstream: https://github.com/bitcoinjs/bech32
- Vendored file: `src/vendor/bech32/index.js`
- Local adaptation: CommonJS exports were converted to ESM exports for extension module usage
