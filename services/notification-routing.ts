import { ReminderEntityType } from "@/services/reminder-rules";

export type NotificationRoutePayload = {
  pathname: string;
  params: Record<string, string>;
};

export function getNotificationRoutePayload(
  entityType: ReminderEntityType,
  entityId: number,
): NotificationRoutePayload {
  if (entityType === "lend") {
    return {
      pathname: "/lend-details/[id]",
      params: { id: entityId.toString() },
    };
  }

  return {
    pathname: "/my-tab-details/[id]",
    params: { id: entityId.toString() },
  };
}
