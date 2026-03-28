import { ReminderEntityType, ReminderKind } from "@/services/reminder-rules";

export type NotificationCopyInput = {
  entityType: ReminderEntityType;
  entityId: number;
  referenceCode: string;
  kind: ReminderKind | "payment_received" | "payment_sent";
  counterpartyName: string;
  amount?: number | null;
};

export function formatNotificationMoney(amount?: number | null) {
  if (typeof amount !== "number" || Number.isNaN(amount)) {
    return "an amount";
  }

  return `PHP ${amount.toFixed(2)}`;
}

export function formatNotificationCopy({
  entityType,
  kind,
  counterpartyName,
  amount,
}: NotificationCopyInput) {
  const formattedAmount = formatNotificationMoney(amount);

  switch (kind) {
    case "due_3d":
      return {
        title: "Upcoming due date",
        body:
          entityType === "lend"
            ? `Reminder: ${counterpartyName} owes you ${formattedAmount} due in 3 days.`
            : `Reminder: You owe ${counterpartyName} ${formattedAmount} due in 3 days.`,
      };
    case "due_1d":
      return {
        title: "Due tomorrow",
        body:
          entityType === "lend"
            ? `Reminder: ${counterpartyName} owes you ${formattedAmount} due tomorrow.`
            : `Reminder: You owe ${counterpartyName} ${formattedAmount} due tomorrow.`,
      };
    case "due_today":
      return {
        title: "Due today",
        body:
          entityType === "lend"
            ? `Reminder: ${counterpartyName} owes you ${formattedAmount} due today.`
            : `Reminder: You owe ${counterpartyName} ${formattedAmount} due today.`,
      };
    case "overdue_1d":
      return {
        title: "Past due",
        body:
          entityType === "lend"
            ? `Heads up: ${counterpartyName}'s payment is 1 day overdue.`
            : `Heads up: Your payment to ${counterpartyName} is 1 day overdue.`,
      };
    case "overdue_7d":
      return {
        title: "Still overdue",
        body:
          entityType === "lend"
            ? `Heads up: ${counterpartyName}'s payment is 1 week overdue.`
            : `Heads up: Your payment to ${counterpartyName} is 1 week overdue.`,
      };
    case "overdue_weekly":
      return {
        title: "Overdue reminder",
        body:
          entityType === "lend"
            ? `Heads up: ${counterpartyName}'s payment is still overdue.`
            : `Heads up: Your payment to ${counterpartyName} is still overdue.`,
      };
    case "payment_received":
      return {
        title: "Payment received",
        body: `Payment received: ${formattedAmount} from ${counterpartyName}.`,
      };
    case "payment_sent":
      return {
        title: "Payment sent",
        body: `Payment sent: ${formattedAmount} to ${counterpartyName}.`,
      };
  }
}
