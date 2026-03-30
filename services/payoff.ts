type InterestType = "Daily" | "Monthly" | "Yearly" | null;

type PayoffParams = {
  principal: number;
  createdAt: string;
  dueDate?: string | null;
  interestEnabled?: boolean;
  interestRate?: number;
  overdueInterestRate?: number | null;
  interestType?: InterestType;
  completedAt?: string | null;
};

const DAY_MS = 1000 * 60 * 60 * 24;

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
    return Math.floor(diff / (DAY_MS * 30.4375));
  }

  if (interestType === "Yearly") {
    return Math.floor(diff / (DAY_MS * 365.25));
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
  dueDate = null,
  interestEnabled = true,
  interestRate = 0,
  overdueInterestRate = null,
  interestType = null,
  completedAt = null,
}: PayoffParams) {
  const start = new Date(createdAt);
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

  const preDueInterest =
    interestEnabled && interestType
      ? principal * ((interestRate || 0) / 100) * preDueIntervals
      : 0;
  const postDueInterest =
    interestEnabled && interestType
      ? principal * ((postDueRate || 0) / 100) * postDueIntervals
      : 0;
  const accruedInterest = preDueInterest + postDueInterest;
  const intervals = preDueIntervals + postDueIntervals;
  const interestStartAt = hasValidDue ? createdAt : createdAt;

  return {
    intervals,
    preDueIntervals,
    postDueIntervals,
    interestStartAt,
    daysElapsed: getElapsedDays(createdAt, completedAt),
    interestDaysElapsed: getElapsedDays(createdAt, completedAt),
    label: getDurationLabel(intervals, interestType),
    preDueInterest,
    postDueInterest,
    accruedInterest,
    payoffTotal: principal + accruedInterest,
  };
}
