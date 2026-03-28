# Notifications Verification

This file tracks the practical verification steps for the offline notification system.

## Automated

Run:

```bash
npx tsx scripts/verify-notifications.ts
```

It validates:
- lend reminder creation
- my-tab reminder creation via shared reminder rules
- due-today scheduling
- overdue scheduling
- quiet-hours normalization
- disabled reminder suppression
- duplicate-key stability
- notification copy tone and money formatting
- notification route payload generation

## Manual Runtime Checks

Use a device build for these checks.

- [ ] Log a lend payment and confirm a notification-history item is created
- [ ] Log a my-tab payment and confirm a notification-history item is created
- [ ] Open the Notifications tab and confirm unread badge state updates
- [ ] Tap a notification and confirm it opens the correct detail screen
- [ ] Mark notifications read by opening the Notifications tab
- [ ] Create an entry with reminders disabled and confirm no due reminders are created
- [ ] Reopen the app repeatedly and confirm reminder dedupe prevents duplicates

## Dev-Only Runtime Helpers

The Notifications tab includes a dev-only verification panel in `__DEV__`.

Buttons:

- `Seed unread reminder`
  - inserts an unread reminder-style notification into SQLite
  - use this to verify the unread badge and notification list rendering

- `Seed payment notif`
  - inserts a payment notification record
  - attempts a local notification if permission is granted
  - use this to verify payment-notification runtime behavior
