# Notifications Plan

This document defines the offline-first notification plan for TabTracker, with future Supabase compatibility.

## Goal

Build notifications in a way that works fully offline today and can later move to Supabase-backed push delivery without changing the core reminder rules.

## Scope

Current phase:
- SQLite is the source of truth
- local notifications only
- in-app notification history
- due-date and overdue reminders

Future phase:
- Supabase becomes the sync/backend layer
- remote push delivery is added later
- reminder logic should stay compatible with the local design

## Notification Rules

### Money Lent To Others

- `3 days before due date`
- `1 day before due date`
- `morning of the due date`
- `1 day overdue`
- `1 week overdue`
- `weekly after that`, capped to avoid spam
- `payment received` immediately when logged

### Money Borrowed From Others

- `3 days before due date`
- `1 day before due date`
- `morning of the due date`
- `1 day overdue`
- `payment sent confirmation` immediately when logged

## Product Principles

- Do not over-notify
- overdue reminders should be capped
- tone must stay gentle and practical
- reminders must be configurable per entry
- do not notify during quiet hours
- schedule reminders for `8-9 AM` local time
- the most important reminder is `1 day before due`

## Offline-First Architecture

### Source Of Truth

Use SQLite for:
- lend data
- my-tab data
- due dates
- reminder settings
- notification history
- dedupe tracking

### Delivery

For now:
- use local notifications only

Later:
- replace delivery with Supabase + push provider
- keep the same reminder rules and notification payload shape

## Database Changes

### Update `lends`

Add:
- `due_date`
- `reminders_enabled`
- `last_reminder_type`
- `last_reminder_at`

### Update `creditors`

Add:
- `due_date`
- `reminders_enabled`
- `last_reminder_type`
- `last_reminder_at`

### Add `notifications`

Suggested fields:
- `id`
- `entity_type`
- `entity_id`
- `reference_code`
- `kind`
- `title`
- `body`
- `scheduled_for`
- `sent_at`
- `read_at`
- `dedupe_key`
- `created_at`

Purpose:
- in-app notification center
- unread badges
- duplicate prevention
- future sync compatibility

## Recommended Files

### `services/database.ts`

Add migrations for:
- due-date fields
- reminder toggle fields
- notification history table

### `services/notifications.ts`

Responsibilities:
- request notification permission
- schedule local notifications
- write notification records
- mark notifications as read
- format titles and bodies

### `services/reminder-rules.ts`

Responsibilities:
- evaluate whether a lend/tab should notify
- generate reminder types
- apply quiet-hours rules
- generate dedupe keys

### `hooks/use-lends.ts`

Trigger:
- `payment received` notification when a lend payment is logged

### `hooks/use-creditors.ts`

Trigger:
- `payment sent confirmation` notification when a my-tab payment is logged

### `app/_layout.tsx`

Responsibilities:
- initialize local notifications
- request permission
- handle notification taps
- later: register remote token when backend exists

### `app/(tabs)/notifications.tsx`

Responsibilities:
- show notification list
- show unread state
- open related lend/tab on tap

### `app/add-lend.tsx`

Add:
- due date input
- per-entry reminder toggle

### `app/my-tab-modal.tsx`

Add:
- due date input
- per-entry reminder toggle

## Routing On Notification Tap

Recommended targets:

- lend-related notification -> `/lend-details/[id]` or `/customer/[id]`
- my-tab notification -> `/my-tab-details/[id]` or `/creditor/[id]`

Do not navigate during render. Handle notification routing in controlled effects or listeners.

## Notification Event Shape

Suggested event model:

```ts
type NotificationEvent =
  | { type: "lend_due_3d"; recordId: number; referenceCode: string }
  | { type: "lend_due_1d"; recordId: number; referenceCode: string }
  | { type: "lend_due_today"; recordId: number; referenceCode: string }
  | { type: "lend_overdue_1d"; recordId: number; referenceCode: string }
  | { type: "lend_overdue_7d"; recordId: number; referenceCode: string }
  | { type: "lend_overdue_weekly"; recordId: number; referenceCode: string }
  | { type: "lend_payment_received"; recordId: number; amount: number; referenceCode: string }
  | { type: "tab_due_3d"; recordId: number; referenceCode: string }
  | { type: "tab_due_1d"; recordId: number; referenceCode: string }
  | { type: "tab_due_today"; recordId: number; referenceCode: string }
  | { type: "tab_overdue_1d"; recordId: number; referenceCode: string }
  | { type: "tab_payment_sent"; recordId: number; amount: number; referenceCode: string };
```

## Dedupe Strategy

Each reminder should generate a stable `dedupe_key`.

Example:

- `lend:abc123:due_1d:2026-03-28`
- `tab:def456:overdue_weekly:2026-04-04`

This prevents duplicate notifications locally now and remotely later.

## Suggested Notification Copy

- `Reminder: Juan owes you PHP 500 due tomorrow.`
- `You owe Maria PHP 1,200 due today.`
- `Carlo's payment is 3 days overdue.`
- `Payment received: PHP 300 from Ana.`
- `Payment sent: PHP 300 to Marco.`

## Recommended Implementation Order

1. Add due-date and reminder fields to SQLite
2. Add `notifications` table
3. Add `services/reminder-rules.ts`
4. Add `services/notifications.ts`
5. Trigger payment notifications from hooks
6. Add due-date reminder scheduling
7. Add notifications tab badge/list
8. Add due-date + reminder controls in lend/my-tab forms
9. Add notification tap routing
10. Later connect Supabase for remote push delivery

## Future Supabase Compatibility

When Supabase is added:

- keep SQLite and local rules during sync transition
- sync `reference_code`, `due_date`, reminder flags, and notification records
- move delivery to backend jobs
- keep the same rule engine semantics
- keep the same dedupe strategy

Supabase should replace the delivery layer later, not the reminder logic design.

## Final Recommendation

Start with:
- `1 day before due`
- `due today`
- `payment logged`

Those provide the highest practical value with the lowest implementation risk.

## Implementation Checklist

### Phase 1: Data Model

- [x] Add `due_date` to `lends`
- [x] Add `reminders_enabled` to `lends`
- [x] Add `last_reminder_type` to `lends`
- [x] Add `last_reminder_at` to `lends`
- [x] Add `due_date` to `creditors`
- [x] Add `reminders_enabled` to `creditors`
- [x] Add `last_reminder_type` to `creditors`
- [x] Add `last_reminder_at` to `creditors`
- [x] Add a new `notifications` table in SQLite
- [x] Add `dedupe_key` support for notifications
- [x] Add `read_at` to track read/unread notification state
- [x] Add migration coverage in `services/database.ts`

### Phase 2: Reminder Rules

- [x] Create `services/reminder-rules.ts`
- [x] Define rule for `3 days before due`
- [x] Define rule for `1 day before due`
- [x] Define rule for `due today`
- [x] Define rule for `1 day overdue`
- [x] Define rule for `1 week overdue`
- [x] Define rule for `weekly overdue reminders`
- [x] Cap recurring overdue reminders to avoid spam
- [x] Apply quiet-hours rule
- [x] Normalize reminder delivery window to `8-9 AM` local time
- [x] Generate stable `dedupe_key` values per reminder

### Phase 3: Notification Service

- [x] Create `services/notifications.ts`
- [x] Add permission request helper
- [x] Add local notification scheduling helper
- [x] Add notification history write helper
- [x] Add mark-as-read helper
- [x] Add unread count helper
- [x] Add title/body formatter for each notification type
- [x] Add payload formatter for navigation targets

### Phase 4: Immediate Transaction Notifications

- [x] Trigger `payment received` notification in `hooks/use-lends.ts`
- [x] Trigger `payment sent confirmation` notification in `hooks/use-creditors.ts`
- [x] Store transaction notifications in local notification history
- [x] Ensure `To Collect` and `My Tab` stay behavior-aligned

### Phase 5: Due-Date Inputs

- [x] Add due-date field to `app/add-lend.tsx`
- [x] Add reminders-enabled toggle to `app/add-lend.tsx`
- [x] Add due-date field to `app/my-tab-modal.tsx`
- [x] Add reminders-enabled toggle to `app/my-tab-modal.tsx`
- [x] Keep form UX mirrored between `To Collect` and `My Tab`

### Phase 6: App Initialization

- [x] Initialize notification setup in `app/_layout.tsx`
- [x] Request notification permission on app startup
- [x] Set up notification tap listeners
- [x] Prevent navigation during render
- [x] Route notification taps through controlled effects or handlers

### Phase 7: Notifications Tab

- [x] Load notification history in `app/(tabs)/notifications.tsx`
- [x] Show unread notifications distinctly
- [x] Add badge/dot support for unread items
- [x] Open related lend/tab when a notification is tapped
- [x] Mark notifications as read when opened

### Phase 8: Scheduling

- [x] Decide when reminders should be evaluated on-device
- [x] Run reminder evaluation on app launch
- [x] Run reminder evaluation when app resumes
- [x] Skip reminders for completed lends
- [x] Skip reminders for completed tabs
- [x] Skip reminders when `reminders_enabled` is off
- [x] Prevent duplicate scheduling using `dedupe_key`

### Phase 9: Copy And Tone

- [x] Keep reminder copy gentle and practical
- [x] Avoid aggressive or confrontational wording
- [x] Use consistent money formatting
- [x] Finalize copy for `due in 3 days`
- [x] Finalize copy for `due tomorrow`
- [x] Finalize copy for `due today`
- [x] Finalize copy for `overdue`
- [x] Finalize copy for `payment received`
- [x] Finalize copy for `payment sent`

### Phase 10: Verification

- [x] Test lend reminder creation
- [x] Test my-tab reminder creation
- [ ] Test payment notification creation
- [x] Test due-today scheduling
- [x] Test overdue scheduling
- [x] Test quiet-hours behavior
- [x] Test notification tap routing
- [ ] Test unread badge state
- [x] Test disabled reminders per entry
- [x] Test duplicate prevention

### Phase 11: Future Supabase Readiness

- [ ] Keep `reference_code` as the stable sync identifier
- [ ] Keep notification logic deterministic
- [ ] Keep delivery separate from rule evaluation
- [ ] Preserve `dedupe_key` in a future backend model
- [ ] Preserve notification history schema for later sync
- [ ] Treat Supabase as a future delivery/sync layer, not a rewrite

## Priority Order

- [ ] Implement `1 day before due`
- [ ] Implement `due today`
- [ ] Implement `payment logged`
- [ ] Implement overdue reminders after the core reminders are stable
- [ ] Add local history/badge support
- [ ] Add Supabase integration later
