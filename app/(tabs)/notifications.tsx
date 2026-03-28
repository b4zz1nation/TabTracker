import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import ScreenContainer from "@/components/screen-container";
import { useNotifications } from "@/contexts/notifications-context";
import { formatNotificationCopy } from "@/services/notification-copy";
import { getNotificationRoutePayload } from "@/services/notification-routing";
import {
  getNotificationHistory,
  getNotificationPayloadData,
  insertNotificationRecord,
  markAllNotificationsRead,
  markNotificationRead,
  NotificationRecord,
  requestNotificationPermission,
  scheduleLocalNotification,
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

  const loadNotifications = useCallback(async () => {
    const history = await getNotificationHistory(db, 100);
    setNotifications(history);
  }, [db]);

  const refreshNotifications = useCallback(async () => {
    await loadNotifications();
    await markAllNotificationsRead(db);
    await refreshUnreadCount();
  }, [db, loadNotifications, refreshUnreadCount]);

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

  const handleSeedUnreadReminder = useCallback(async () => {
    const now = new Date().toISOString();
    await insertNotificationRecord(db, {
      entityType: "lend",
      entityId: 1,
      referenceCode: "DEBUGREMIND01",
      kind: "due_1d",
      title: "Due tomorrow",
      body: "Reminder: Debug Customer owes you PHP 500.00 due tomorrow.",
      dedupeKey: `debug:unread:${now}`,
    });
    await loadNotifications();
    await refreshUnreadCount();
  }, [db, loadNotifications, refreshUnreadCount]);

  const handleSeedPaymentNotification = useCallback(async () => {
    const now = new Date().toISOString();
    const copy = formatNotificationCopy({
      entityType: "lend",
      entityId: 1,
      referenceCode: "DEBUGPAY0001",
      kind: "payment_received",
      counterpartyName: "Debug Customer",
      amount: 300,
    });

    await insertNotificationRecord(db, {
      entityType: "lend",
      entityId: 1,
      referenceCode: "DEBUGPAY0001",
      kind: "payment_received",
      title: copy.title,
      body: copy.body,
      sentAt: now,
      dedupeKey: `debug:payment:${now}`,
    });

    const permission = await requestNotificationPermission();
    if (permission.granted) {
      await scheduleLocalNotification(
        copy.title,
        copy.body,
        getNotificationPayloadData("lend", 1, "DEBUGPAY0001"),
      );
    }

    await loadNotifications();
    await refreshUnreadCount();
  }, [db, loadNotifications, refreshUnreadCount]);

  return (
    <ScreenContainer header={header} scrollable={true} centerContent={false}>
      {__DEV__ && (
        <View className="px-5 pb-5 gap-3">
          <View className="rounded-[24px] border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4">
            <Text className="text-sm font-bold text-amber-700 dark:text-amber-300 mb-3">
              Notification verification
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={handleSeedUnreadReminder}
                className="flex-1 rounded-2xl bg-sky-500 px-4 py-3"
              >
                <Text className="text-white font-semibold text-center">
                  Seed unread reminder
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSeedPaymentNotification}
                className="flex-1 rounded-2xl bg-emerald-500 px-4 py-3"
              >
                <Text className="text-white font-semibold text-center">
                  Seed payment notif
                </Text>
              </Pressable>
            </View>
            <Text className="text-[11px] text-amber-700 dark:text-amber-300 mt-3">
              Use these buttons on a dev build to verify unread badge and
              payment notification behavior.
            </Text>
          </View>
        </View>
      )}
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
