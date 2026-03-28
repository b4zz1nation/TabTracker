export type ReminderEntityType = "lend" | "tab";

export type ReminderKind =
  | "due_3d"
  | "due_1d"
  | "due_today"
  | "overdue_1d"
  | "overdue_7d"
  | "overdue_weekly";

export type RemindableEntry = {
  entityType: ReminderEntityType;
  id: number;
  referenceCode: string;
  dueDate: string | null;
  remindersEnabled: boolean;
  completedAt?: string | null;
  lastReminderType?: ReminderKind | null;
  lastReminderAt?: string | null;
};

export type ReminderCandidate = {
  entityType: ReminderEntityType;
  entityId: number;
  referenceCode: string;
  kind: ReminderKind;
  scheduledFor: string;
  dedupeKey: string;
};

const QUIET_HOUR_START = 8;
const QUIET_HOUR_END = 9;
const DELIVERY_HOUR = 8;
const DELIVERY_MINUTE = 0;
const MAX_WEEKLY_OVERDUE_REMINDERS = 8;

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function diffInDays(from: Date, to: Date) {
  const fromDay = startOfLocalDay(from).getTime();
  const toDay = startOfLocalDay(to).getTime();
  return Math.round((toDay - fromDay) / (1000 * 60 * 60 * 24));
}

export function isWithinQuietHours(date: Date) {
  const hour = date.getHours();
  return hour < QUIET_HOUR_START || hour >= QUIET_HOUR_END;
}

export function normalizeReminderDeliveryTime(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    DELIVERY_HOUR,
    DELIVERY_MINUTE,
    0,
    0,
  );
}

export function getReminderDateForKind(
  dueDate: Date,
  kind: ReminderKind,
  weekIndex: number = 0,
) {
  switch (kind) {
    case "due_3d":
      return addDays(dueDate, -3);
    case "due_1d":
      return addDays(dueDate, -1);
    case "due_today":
      return dueDate;
    case "overdue_1d":
      return addDays(dueDate, 1);
    case "overdue_7d":
      return addDays(dueDate, 7);
    case "overdue_weekly":
      return addDays(dueDate, 14 + weekIndex * 7);
  }
}

export function getDedupeKey(
  entityType: ReminderEntityType,
  referenceCode: string,
  kind: ReminderKind,
  scheduleDate: Date,
) {
  const day = startOfLocalDay(scheduleDate).toISOString().slice(0, 10);
  return `${entityType}:${referenceCode}:${kind}:${day}`;
}

export function getReminderCandidates(
  entry: RemindableEntry,
  now: Date = new Date(),
) {
  if (!entry.remindersEnabled || !entry.dueDate || entry.completedAt) {
    return [] as ReminderCandidate[];
  }

  const dueDate = new Date(entry.dueDate);
  if (Number.isNaN(dueDate.getTime())) {
    return [] as ReminderCandidate[];
  }

  const dayOffset = diffInDays(now, dueDate);
  const candidates: ReminderCandidate[] = [];

  const pushCandidate = (kind: ReminderKind, date: Date) => {
    const scheduled = normalizeReminderDeliveryTime(date);
    candidates.push({
      entityType: entry.entityType,
      entityId: entry.id,
      referenceCode: entry.referenceCode,
      kind,
      scheduledFor: scheduled.toISOString(),
      dedupeKey: getDedupeKey(
        entry.entityType,
        entry.referenceCode,
        kind,
        scheduled,
      ),
    });
  };

  if (dayOffset === 3) {
    pushCandidate("due_3d", getReminderDateForKind(dueDate, "due_3d"));
  }

  if (dayOffset === 1) {
    pushCandidate("due_1d", getReminderDateForKind(dueDate, "due_1d"));
  }

  if (dayOffset === 0) {
    pushCandidate("due_today", getReminderDateForKind(dueDate, "due_today"));
  }

  if (dayOffset === -1) {
    pushCandidate("overdue_1d", getReminderDateForKind(dueDate, "overdue_1d"));
  }

  if (dayOffset === -7) {
    pushCandidate("overdue_7d", getReminderDateForKind(dueDate, "overdue_7d"));
  }

  if (dayOffset <= -14) {
    const overdueDays = Math.abs(dayOffset);
    const weeklyOffset = overdueDays - 14;
    const weekIndex = Math.floor(weeklyOffset / 7);
    const isWeeklyBoundary = weeklyOffset % 7 === 0;

    if (isWeeklyBoundary && weekIndex < MAX_WEEKLY_OVERDUE_REMINDERS) {
      pushCandidate(
        "overdue_weekly",
        getReminderDateForKind(dueDate, "overdue_weekly", weekIndex),
      );
    }
  }

  return candidates;
}

export function getDueReminderKind(dayOffset: number): ReminderKind | null {
  if (dayOffset === 3) return "due_3d";
  if (dayOffset === 1) return "due_1d";
  if (dayOffset === 0) return "due_today";
  if (dayOffset === -1) return "overdue_1d";
  if (dayOffset === -7) return "overdue_7d";

  if (dayOffset <= -14) {
    const overdueDays = Math.abs(dayOffset);
    if ((overdueDays - 14) % 7 === 0) {
      const weekIndex = Math.floor((overdueDays - 14) / 7);
      if (weekIndex < MAX_WEEKLY_OVERDUE_REMINDERS) {
        return "overdue_weekly";
      }
    }
  }

  return null;
}

export function isReminderDueNow(
  candidate: ReminderCandidate,
  now: Date = new Date(),
) {
  return new Date(candidate.scheduledFor).getTime() <= now.getTime();
}

export function getReminderWindow() {
  return {
    quietHourStart: QUIET_HOUR_START,
    quietHourEnd: QUIET_HOUR_END,
    deliveryHour: DELIVERY_HOUR,
    deliveryMinute: DELIVERY_MINUTE,
    maxWeeklyOverdueReminders: MAX_WEEKLY_OVERDUE_REMINDERS,
  };
}
