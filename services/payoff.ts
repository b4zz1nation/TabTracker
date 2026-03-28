type InterestType = "Daily" | "Monthly" | "Yearly" | null;

type PayoffParams = {
  principal: number;
  createdAt: string;
  interestEnabled?: boolean;
  interestRate?: number;
  interestType?: InterestType;
  completedAt?: string | null;
};

const DAY_MS = 1000 * 60 * 60 * 24;

export function getElapsedIntervals(
  createdAt: string,
  interestType: InterestType,
  completedAt?: string | null,
) {
  const start = new Date(createdAt);
  const end = completedAt ? new Date(completedAt) : new Date();
  const diff = Math.max(0, end.getTime() - start.getTime());

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

export function getDurationLabel(intervals: number, interestType: InterestType) {
  if (interestType === "Daily") return `${intervals} Days`;
  if (interestType === "Monthly") return `${intervals} Months`;
  if (interestType === "Yearly") return `${intervals} Years`;
  return "No interest";
}

export function getElapsedDays(createdAt: string, completedAt?: string | null) {
  const start = new Date(createdAt);
  const end = completedAt ? new Date(completedAt) : new Date();
  return Math.floor(Math.max(0, end.getTime() - start.getTime()) / DAY_MS);
}

export function calculatePayoff({
  principal,
  createdAt,
  interestEnabled = true,
  interestRate = 0,
  interestType = null,
  completedAt = null,
}: PayoffParams) {
  const intervals =
    interestEnabled && interestType
      ? getElapsedIntervals(createdAt, interestType, completedAt)
      : 0;
  const accruedInterest =
    interestEnabled && interestType
      ? principal * ((interestRate || 0) / 100) * intervals
      : 0;

  return {
    intervals,
    daysElapsed: getElapsedDays(createdAt, completedAt),
    label: getDurationLabel(intervals, interestType),
    accruedInterest,
    payoffTotal: principal + accruedInterest,
  };
}
