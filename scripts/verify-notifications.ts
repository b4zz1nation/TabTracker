import {
  getDedupeKey,
  getReminderCandidates,
  getReminderWindow,
  isReminderDueNow,
  normalizeReminderDeliveryTime,
  type RemindableEntry,
} from "../services/reminder-rules";
import {
  formatNotificationCopy,
  formatNotificationMoney,
} from "../services/notification-copy";
import { getNotificationRoutePayload } from "../services/notification-routing";

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}. Expected "${expected}" but got "${actual}"`);
  }
}

function buildEntry(
  dueDate: string,
  overrides?: Partial<RemindableEntry>,
): RemindableEntry {
  return {
    entityType: "lend",
    id: 1,
    referenceCode: "ABCD1234EFGH",
    dueDate,
    remindersEnabled: true,
    completedAt: null,
    lastReminderType: null,
    lastReminderAt: null,
    ...overrides,
  };
}

function run() {
  const now = new Date("2026-04-10T10:30:00.000Z");

  const due3Days = getReminderCandidates(
    buildEntry("2026-04-13T09:00:00.000Z"),
    now,
  );
  assertEqual(due3Days[0]?.kind, "due_3d", "Should create 3-day reminder");

  const dueTomorrow = getReminderCandidates(
    buildEntry("2026-04-11T09:00:00.000Z"),
    now,
  );
  assertEqual(dueTomorrow[0]?.kind, "due_1d", "Should create 1-day reminder");

  const dueToday = getReminderCandidates(
    buildEntry("2026-04-10T09:00:00.000Z"),
    now,
  );
  assertEqual(
    dueToday[0]?.kind,
    "due_today",
    "Should create due-today reminder",
  );
  assert(
    isReminderDueNow(dueToday[0], now),
    "Due-today reminder should be due now",
  );

  const overdueOneDay = getReminderCandidates(
    buildEntry("2026-04-09T09:00:00.000Z"),
    now,
  );
  assertEqual(
    overdueOneDay[0]?.kind,
    "overdue_1d",
    "Should create 1-day overdue reminder",
  );

  const overdueWeek = getReminderCandidates(
    buildEntry("2026-04-03T09:00:00.000Z"),
    now,
  );
  assertEqual(
    overdueWeek[0]?.kind,
    "overdue_7d",
    "Should create 7-day overdue reminder",
  );

  const overdueWeekly = getReminderCandidates(
    buildEntry("2026-03-27T09:00:00.000Z"),
    now,
  );
  assertEqual(
    overdueWeekly[0]?.kind,
    "overdue_weekly",
    "Should create weekly overdue reminder",
  );

  const disabled = getReminderCandidates(
    buildEntry("2026-04-11T09:00:00.000Z", { remindersEnabled: false }),
    now,
  );
  assertEqual(
    disabled.length,
    0,
    "Disabled reminders should not create candidates",
  );

  const completed = getReminderCandidates(
    buildEntry("2026-04-11T09:00:00.000Z", {
      completedAt: "2026-04-10T09:00:00.000Z",
    }),
    now,
  );
  assertEqual(
    completed.length,
    0,
    "Completed entries should not create candidates",
  );

  const normalized = normalizeReminderDeliveryTime(
    new Date("2026-04-10T23:59:00.000Z"),
  );
  assertEqual(
    normalized.getHours(),
    8,
    "Delivery hour should normalize to 8 AM",
  );
  assertEqual(
    normalized.getMinutes(),
    0,
    "Delivery minute should normalize to 00",
  );

  const dedupeA = getDedupeKey(
    "lend",
    "ABCD1234EFGH",
    "due_1d",
    new Date(2026, 3, 10, 8, 0, 0, 0),
  );
  const dedupeB = getDedupeKey(
    "lend",
    "ABCD1234EFGH",
    "due_1d",
    new Date(2026, 3, 10, 18, 0, 0, 0),
  );
  assertEqual(dedupeA, dedupeB, "Dedupe key should be stable for the same day");

  assertEqual(
    formatNotificationMoney(500),
    "PHP 500.00",
    "Money formatting should be consistent",
  );

  const dueTomorrowCopy = formatNotificationCopy({
    entityType: "lend",
    entityId: 1,
    referenceCode: "ABCD1234EFGH",
    kind: "due_1d",
    counterpartyName: "Juan",
    amount: 500,
  });
  assert(
    dueTomorrowCopy.body.includes(
      "Reminder: Juan owes you PHP 500.00 due tomorrow.",
    ),
    "Due tomorrow copy should be gentle and specific",
  );

  const overdueCopy = formatNotificationCopy({
    entityType: "tab",
    entityId: 2,
    referenceCode: "BCDE2345FGHI",
    kind: "overdue_1d",
    counterpartyName: "Maria",
  });
  assert(
    overdueCopy.body.includes(
      "Heads up: Your payment to Maria is 1 day overdue.",
    ),
    "Overdue copy should use gentle wording",
  );

  const paymentCopy = formatNotificationCopy({
    entityType: "lend",
    entityId: 1,
    referenceCode: "ABCD1234EFGH",
    kind: "payment_received",
    counterpartyName: "Ana",
    amount: 300,
  });
  assert(
    paymentCopy.body.includes("Payment received: PHP 300.00 from Ana."),
    "Payment copy should be formatted consistently",
  );

  const route = getNotificationRoutePayload("tab", 42);
  assertEqual(
    route.pathname,
    "/my-tab-details/[id]",
    "Tab notifications should route to my-tab details",
  );
  assertEqual(
    route.params.id,
    "42",
    "Notification route should include record id",
  );

  const window = getReminderWindow();
  assertEqual(
    window.deliveryHour,
    8,
    "Reminder window should use 8 AM delivery",
  );
  assertEqual(
    window.maxWeeklyOverdueReminders,
    8,
    "Weekly overdue reminders should be capped",
  );

  console.log("Notification verification passed");
}

run();
