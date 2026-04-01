type InterestType = "Daily" | "Monthly" | "Yearly" | null;

type PayoffParams = {
  principal: number;
  createdAt: string;
  startAt?: string | null;
  dueDate?: string | null;
  interestEnabled?: boolean;
  interestRate?: number;
  overdueInterestRate?: number | null;
  interestType?: InterestType;
  completedAt?: string | null;
};

const DAY_MS = 1000 * 60 * 60 * 24;

function getDaysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function isLastDayOfMonth(date: Date) {
  return date.getDate() === getDaysInMonth(date.getFullYear(), date.getMonth());
}

function addMonthsClamped(date: Date, monthsToAdd: number) {
  const next = new Date(date);
  const originalDay = date.getDate();
  const preserveMonthEnd = isLastDayOfMonth(date);

  next.setDate(1);
  next.setMonth(next.getMonth() + monthsToAdd);

  const targetDay = preserveMonthEnd
    ? getDaysInMonth(next.getFullYear(), next.getMonth())
    : Math.min(
        originalDay,
        getDaysInMonth(next.getFullYear(), next.getMonth()),
      );

  next.setDate(targetDay);
  return next;
}

function addYearsClamped(date: Date, yearsToAdd: number) {
  const next = new Date(date);
  const originalMonth = date.getMonth();
  const originalDay = date.getDate();
  const preserveMonthEnd = isLastDayOfMonth(date);

  next.setFullYear(next.getFullYear() + yearsToAdd, originalMonth, 1);
  const targetDay = preserveMonthEnd
    ? getDaysInMonth(next.getFullYear(), originalMonth)
    : Math.min(originalDay, getDaysInMonth(next.getFullYear(), originalMonth));

  next.setDate(targetDay);
  return next;
}

function getElapsedIntervalsFromDates(
  startAt: Date,
  endAt: Date,
  interestType: InterestType,
) {
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return 0;
  }

  const diff = Math.max(0, endAt.getTime() - startAt.getTime());

  if (interestType === "Daily") {
    return Math.floor(diff / DAY_MS);
  }

  if (interestType === "Monthly") {
    let intervals = 0;
    let cursor = new Date(startAt);

    while (true) {
      const next = addMonthsClamped(cursor, 1);
      if (next.getTime() > endAt.getTime()) {
        return intervals;
      }
      cursor = next;
      intervals += 1;
    }
  }

  if (interestType === "Yearly") {
    let intervals = 0;
    let cursor = new Date(startAt);

    while (true) {
      const next = addYearsClamped(cursor, 1);
      if (next.getTime() > endAt.getTime()) {
        return intervals;
      }
      cursor = next;
      intervals += 1;
    }
  }

  return 0;
}

export function getDurationLabel(
  intervals: number,
  interestType: InterestType,
) {
  if (interestType === "Daily") return `${intervals} Days`;
  if (interestType === "Monthly") return `${intervals} Months`;
  if (interestType === "Yearly") return `${intervals} Years`;
  return "No interest";
}

export function getElapsedDays(createdAt: string, completedAt?: string | null) {
  const start = new Date(createdAt);
  const end = completedAt ? new Date(completedAt) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }
  return Math.floor(Math.max(0, end.getTime() - start.getTime()) / DAY_MS);
}

export function getInterestStartAt(
  createdAt: string,
  dueDate?: string | null,
): string {
  // Interest accrues from due date when set; otherwise from creation date.
  // If due date is invalid, fall back safely to creation date.
  if (!dueDate) return createdAt;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return createdAt;
  return dueDate;
}

export function calculatePayoff({
  principal,
  createdAt,
  startAt = null,
  dueDate = null,
  interestEnabled = true,
  interestRate = 0,
  overdueInterestRate = null,
  interestType = null,
  completedAt = null,
}: PayoffParams) {
  const effectiveStartAt = startAt || createdAt;
  const start = new Date(effectiveStartAt);
  const end = completedAt ? new Date(completedAt) : new Date();
  const due = dueDate ? new Date(dueDate) : null;
  const hasValidDue = !!due && !Number.isNaN(due.getTime());
  const normalizedOverdueRate =
    overdueInterestRate !== null &&
    overdueInterestRate !== undefined &&
    Number.isFinite(overdueInterestRate)
      ? overdueInterestRate
      : null;
  const postDueRate = normalizedOverdueRate ?? interestRate;

  let preDueIntervals = 0;
  let postDueIntervals = 0;

  if (interestEnabled && interestType && !Number.isNaN(start.getTime())) {
    if (hasValidDue && due && due.getTime() > start.getTime()) {
      const preEnd = new Date(Math.min(end.getTime(), due.getTime()));
      preDueIntervals = getElapsedIntervalsFromDates(
        start,
        preEnd,
        interestType,
      );
      if (end.getTime() > due.getTime()) {
        postDueIntervals = getElapsedIntervalsFromDates(due, end, interestType);
      }
    } else if (hasValidDue && due) {
      // Existing entries can be encoded after the real due date.
      // In that case, apply overdue rate from due date forward.
      postDueIntervals = getElapsedIntervalsFromDates(due, end, interestType);
    } else {
      preDueIntervals = getElapsedIntervalsFromDates(start, end, interestType);
    }
  }

  const preDueBalance =
    interestEnabled && interestType
      ? principal * Math.pow(1 + (interestRate || 0) / 100, preDueIntervals)
      : principal;
  const finalBalance =
    interestEnabled && interestType
      ? preDueBalance * Math.pow(1 + (postDueRate || 0) / 100, postDueIntervals)
      : principal;
  const preDueInterest = Math.max(0, preDueBalance - principal);
  const postDueInterest = Math.max(0, finalBalance - preDueBalance);
  const accruedInterest = preDueInterest + postDueInterest;
  const intervals = preDueIntervals + postDueIntervals;
  const interestStartAt = effectiveStartAt;

  return {
    intervals,
    preDueIntervals,
    postDueIntervals,
    interestStartAt,
    daysElapsed: getElapsedDays(effectiveStartAt, completedAt),
    interestDaysElapsed: getElapsedDays(effectiveStartAt, completedAt),
    label: getDurationLabel(intervals, interestType),
    preDueInterest,
    postDueInterest,
    accruedInterest,
    payoffTotal: finalBalance,
  };
}
