import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import ScreenContainer from "@/components/screen-container";
import { useNotifications } from "@/contexts/notifications-context";
import { getNotificationRoutePayload } from "@/services/notification-routing";
import {
  getNotificationHistory,
  markAllNotificationsRead,
  markNotificationRead,
  NotificationRecord,
} from "@/services/notifications";

function formatNotificationTimestamp(record: NotificationRecord) {
  const source = record.scheduled_for || record.sent_at || record.created_at;
  return new Date(source).toLocaleString();
}

function getNotificationIcon(kind: string) {
  if (kind.includes("payment")) return "cash-outline";
  if (kind.includes("overdue")) return "alert-circle-outline";
  return "notifications-outline";
}

function getNotificationAccent(kind: string) {
  if (kind.includes("payment")) return "#10b981";
  if (kind.includes("overdue")) return "#f97316";
  return "#0ea5e9";
}

export default function NotificationsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { refreshUnreadCount } = useNotifications();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);

  const refreshNotifications = useCallback(async () => {
    const history = await getNotificationHistory(db, 100);
    setNotifications(history);
    await markAllNotificationsRead(db);
    await refreshUnreadCount();
  }, [db, refreshUnreadCount]);

  useFocusEffect(
    useCallback(() => {
      refreshNotifications();
    }, [refreshNotifications]),
  );

  const header = useMemo(
    () => (
      <View className="px-5 py-4">
        <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Notifications
        </Text>
      </View>
    ),
    [],
  );

  const handleOpenNotification = useCallback(
    async (record: NotificationRecord) => {
      await markNotificationRead(db, record.id);
      await refreshUnreadCount();
      const route = getNotificationRoutePayload(
        record.entity_type,
        record.entity_id,
      );
      router.push(route);
    },
    [db, refreshUnreadCount, router],
  );

  return (
    <ScreenContainer header={header} scrollable={true} centerContent={false}>
      {notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center p-10">
          <Ionicons name="notifications-outline" size={64} color="#d1d5db" />
          <Text className="text-gray-400 mt-4 text-center">
            No notifications yet.
          </Text>
        </View>
      ) : (
        <View className="px-5 pb-10 gap-3">
          {notifications.map((record) => {
            const accent = getNotificationAccent(record.kind);
            return (
              <Pressable
                key={record.id}
                onPress={() => handleOpenNotification(record)}
                className={`rounded-[28px] border px-5 py-4 bg-white dark:bg-gray-900 ${
                  record.read_at
                    ? "border-gray-100 dark:border-gray-800"
                    : "border-sky-200 dark:border-sky-800"
                }`}
              >
                <View className="flex-row items-start">
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: `${accent}20` }}
                  >
                    <Ionicons
                      name={getNotificationIcon(record.kind)}
                      size={18}
                      color={accent}
                    />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-base font-bold text-gray-900 dark:text-gray-100 pr-3">
                        {record.title}
                      </Text>
                      {!record.read_at && (
                        <View
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: accent }}
                        />
                      )}
                    </View>
                    <Text className="text-sm text-gray-600 dark:text-gray-300 leading-5">
                      {record.body}
                    </Text>
                    <Text className="text-[10px] text-gray-400 mt-3 font-semibold">
                      {formatNotificationTimestamp(record)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScreenContainer>
  );
}
