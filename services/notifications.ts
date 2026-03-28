import * as Notifications from "expo-notifications";
import { SQLiteDatabase } from "expo-sqlite";
import { Platform } from "react-native";

import {
  getReminderCandidates,
  isReminderDueNow,
  ReminderCandidate,
  ReminderEntityType,
  ReminderKind,
  RemindableEntry,
} from "@/services/reminder-rules";
import {
  formatNotificationCopy,
  NotificationCopyInput,
} from "@/services/notification-copy";
import {
  getNotificationRoutePayload,
  NotificationRoutePayload,
} from "@/services/notification-routing";

export type NotificationRecord = {
  id: number;
  entity_type: ReminderEntityType;
  entity_id: number;
  reference_code: string | null;
  kind: string;
  title: string;
  body: string;
  scheduled_for: string | null;
  sent_at: string | null;
  read_at: string | null;
  dedupe_key: string;
  created_at: string;
};

export type NotificationInsertInput = {
  entityType: ReminderEntityType;
  entityId: number;
  referenceCode: string | null;
  kind: string;
  title: string;
  body: string;
  scheduledFor?: string | null;
  sentAt?: string | null;
  readAt?: string | null;
  dedupeKey: string;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission() {
  if (Platform.OS === "web") {
    return {
      granted: false,
      canAskAgain: false,
      status: "undetermined" as const,
    };
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return current;
  }

  return Notifications.requestPermissionsAsync();
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  data: Record<string, string>,
  scheduledFor?: string | null,
) {
  if (Platform.OS === "web") {
    return null;
  }

  const triggerDate = scheduledFor ? new Date(scheduledFor) : null;
  const hasValidTrigger =
    triggerDate &&
    !Number.isNaN(triggerDate.getTime()) &&
    triggerDate > new Date();

  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
    },
    trigger: hasValidTrigger ? triggerDate : null,
  });
}

export async function insertNotificationRecord(
  db: SQLiteDatabase,
  input: NotificationInsertInput,
) {
  await db.runAsync(
    `INSERT OR IGNORE INTO notifications (
      entity_type,
      entity_id,
      reference_code,
      kind,
      title,
      body,
      scheduled_for,
      sent_at,
      read_at,
      dedupe_key
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.entityType,
      input.entityId,
      input.referenceCode,
      input.kind,
      input.title,
      input.body,
      input.scheduledFor ?? null,
      input.sentAt ?? null,
      input.readAt ?? null,
      input.dedupeKey,
    ],
  );

  return db.getFirstAsync<NotificationRecord>(
    "SELECT * FROM notifications WHERE dedupe_key = ?",
    [input.dedupeKey],
  );
}

export async function upsertReminderNotification(
  db: SQLiteDatabase,
  candidate: ReminderCandidate,
  counterpartyName: string,
  amount?: number | null,
) {
  const copy = formatNotificationCopy({
    entityType: candidate.entityType,
    entityId: candidate.entityId,
    referenceCode: candidate.referenceCode,
    kind: candidate.kind,
    counterpartyName,
    amount,
  });

  return insertNotificationRecord(db, {
    entityType: candidate.entityType,
    entityId: candidate.entityId,
    referenceCode: candidate.referenceCode,
    kind: candidate.kind,
    title: copy.title,
    body: copy.body,
    scheduledFor: candidate.scheduledFor,
    dedupeKey: candidate.dedupeKey,
  });
}

export async function markNotificationRead(
  db: SQLiteDatabase,
  notificationId: number,
) {
  await db.runAsync(
    "UPDATE notifications SET read_at = COALESCE(read_at, ?) WHERE id = ?",
    [new Date().toISOString(), notificationId],
  );
}

export async function markAllNotificationsRead(db: SQLiteDatabase) {
  await db.runAsync(
    "UPDATE notifications SET read_at = COALESCE(read_at, ?) WHERE read_at IS NULL",
    [new Date().toISOString()],
  );
}

export async function getUnreadNotificationCount(db: SQLiteDatabase) {
  const result = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM notifications WHERE read_at IS NULL",
  );
  return result?.count ?? 0;
}

export async function getNotificationHistory(
  db: SQLiteDatabase,
  limit: number = 50,
) {
  return db.getAllAsync<NotificationRecord>(
    "SELECT * FROM notifications ORDER BY COALESCE(scheduled_for, created_at) DESC LIMIT ?",
    [limit],
  );
}

export function getNotificationPayloadData(
  entityType: ReminderEntityType,
  entityId: number,
  referenceCode?: string | null,
) {
  const route = getNotificationRoutePayload(entityType, entityId);
  return {
    entityType,
    entityId: entityId.toString(),
    referenceCode: referenceCode ?? "",
    pathname: route.pathname,
    ...route.params,
  };
}

async function hasNotificationWithDedupeKey(
  db: SQLiteDatabase,
  dedupeKey: string,
) {
  const existing = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM notifications WHERE dedupe_key = ? LIMIT 1",
    [dedupeKey],
  );
  return !!existing?.id;
}

async function evaluateReminderCandidates(
  db: SQLiteDatabase,
  entries: Array<
    RemindableEntry & {
      counterpartyName: string;
      amount: number;
    }
  >,
) {
  const permission = await requestNotificationPermission();
  const now = new Date();

  for (const entry of entries) {
    const candidates = getReminderCandidates(entry, now).filter((candidate) =>
      isReminderDueNow(candidate, now),
    );

    for (const candidate of candidates) {
      const alreadyExists = await hasNotificationWithDedupeKey(
        db,
        candidate.dedupeKey,
      );
      if (alreadyExists) {
        continue;
      }

      const record = await upsertReminderNotification(
        db,
        candidate,
        entry.counterpartyName,
        entry.amount,
      );

      if (record) {
        if (entry.entityType === "lend") {
          await db.runAsync(
            "UPDATE lends SET last_reminder_type = ?, last_reminder_at = ? WHERE id = ?",
            [candidate.kind, now.toISOString(), entry.id],
          );
        } else {
          await db.runAsync(
            "UPDATE creditors SET last_reminder_type = ?, last_reminder_at = ? WHERE id = ?",
            [candidate.kind, now.toISOString(), entry.id],
          );
        }
      }

      if (permission.granted) {
        await scheduleLocalNotification(
          record?.title ?? "",
          record?.body ?? "",
          getNotificationPayloadData(
            candidate.entityType,
            candidate.entityId,
            candidate.referenceCode,
          ),
        );
      }
    }
  }
}

export async function evaluateDueReminders(db: SQLiteDatabase) {
  const lends = await db.getAllAsync<
    RemindableEntry & {
      counterpartyName: string;
      amount: number;
    }
  >(
    `SELECT
      l.id,
      l.reference_code as referenceCode,
      l.due_date as dueDate,
      l.reminders_enabled as remindersEnabled,
      l.completed_at as completedAt,
      l.last_reminder_type as lastReminderType,
      l.last_reminder_at as lastReminderAt,
      l.amount,
      c.name as counterpartyName
    FROM lends l
    JOIN customers c ON c.id = l.customer_id
    WHERE l.due_date IS NOT NULL
      AND l.status = 'Ongoing'
      AND COALESCE(l.reminders_enabled, 1) = 1`,
  );

  const normalizedLends = lends.map((lend) => ({
    ...lend,
    entityType: "lend" as const,
    remindersEnabled: !!lend.remindersEnabled,
  }));

  const creditors = await db.getAllAsync<
    RemindableEntry & {
      counterpartyName: string;
      amount: number;
    }
  >(
    `SELECT
      id,
      reference_code as referenceCode,
      due_date as dueDate,
      reminders_enabled as remindersEnabled,
      completed_at as completedAt,
      last_reminder_type as lastReminderType,
      last_reminder_at as lastReminderAt,
      balance as amount,
      name as counterpartyName
    FROM creditors
    WHERE due_date IS NOT NULL
      AND balance > 0
      AND COALESCE(reminders_enabled, 1) = 1`,
  );

  const normalizedCreditors = creditors.map((creditor) => ({
    ...creditor,
    entityType: "tab" as const,
    remindersEnabled: !!creditor.remindersEnabled,
  }));

  await evaluateReminderCandidates(db, normalizedLends);
  await evaluateReminderCandidates(db, normalizedCreditors);
}
