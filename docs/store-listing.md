# Store Listing Notes

## Permissions justification

- `storage`: Stores profiles, folders, view history, and settings locally in the extension.
- `activeTab`: Reads the URL of the active tab when the user clicks Add to detect the current model.
- `tabs`: Observes tab activation/updates/removals to track view sessions on supported sites.

## Host permissions justification

- `https://chaturbate.com/*`: Detects model pages to parse usernames and track view time.
- `https://stripchat.com/*`: Detects model pages to parse usernames and track view time.
