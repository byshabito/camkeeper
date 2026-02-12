# Nostr Basics for CamKeeper Users

If you are new to Nostr, this page explains the basics in plain language and how CamKeeper uses it.

## What is Nostr?

Nostr is an open protocol for publishing signed events to relay servers.
It is not a single app or company. Different clients can read and publish compatible events across relays.

In short:

- Your key proves your identity
- Relays move data around
- Clients (apps) decide how to use that data

## Core concepts

### Keys: `nsec` and `npub`

- `nsec` is your private key. Treat it like a password that can control your identity.
- `npub` is your public key. It is safe to share.
- Anyone with your `nsec` can act as you.

### Relays

- Relays are servers that store and forward Nostr events.
- You can choose which relays you use.
- Different relays can have different policies, reliability, and uptime.

### Events and signatures

- Nostr data is represented as events.
- Events are cryptographically signed by your private key.
- Signatures let clients verify that an event really came from your key.

### Encryption

- Signatures prove authorship, but they do not hide content.
- CamKeeper encrypts sync payloads before publishing them.
- Relay operators can still observe metadata (for example timing and your public key).

## How CamKeeper uses Nostr

CamKeeper uses Nostr only as an **optional** sync transport.

- Sync is disabled by default.
- Local use and offline use continue to work even if sync is off or relays fail.
- CamKeeper stores profile data locally first, then syncs encrypted payloads only when you enable it.
- You configure your own relay list.

CamKeeper does **not** use Nostr for social posting or chat.

## Privacy expectations

Even with encrypted payloads, some metadata can still be visible to relay operators and network observers:

- Your public key
- Event timing
- Relay endpoints you connect to
- Potential network identifiers (for example IP address)

This is normal for relay-based systems and is important to understand before enabling sync.

## Keep your key safe

- Never share your `nsec`.
- Never post it in screenshots, issue reports, or chat.
- Store it only on devices you trust.
- If you think it leaked, generate a new key and stop using the old one.

CamKeeper maintainers/support should never ask for your private key.

## Learn more

- Nostr protocol notes (NIPs): [github.com/nostr-protocol/nips](https://github.com/nostr-protocol/nips)
- CamKeeper privacy policy: [Privacy](/privacy/)
- CamKeeper support: [Support](/support/)
