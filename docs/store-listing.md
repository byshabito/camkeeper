# Store Listing Notes

## Permissions justification

- `storage`: Stores profiles, folders, view history, and settings locally in the extension.
- `activeTab`: Reads the URL of the active tab when the user clicks Add to detect the current model.
- `tabs`: Observes tab activation/updates/removals so the background service worker can track view sessions on supported sites.

## Host permissions justification

- `https://chaturbate.com/*`: Detects model pages and allows the background service worker to track view sessions on Chaturbate.
- `https://stripchat.com/*`: Detects model pages and allows the background service worker to track view sessions on Stripchat.
