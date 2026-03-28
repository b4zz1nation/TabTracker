import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppState } from "react-native";
import { useSQLiteContext } from "expo-sqlite";

import { getUnreadNotificationCount } from "@/services/notifications";

type NotificationsContextType = {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextType>({
  unreadCount: 0,
  refreshUnreadCount: async () => {},
});

export function NotificationsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const db = useSQLiteContext();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadNotificationCount(db);
      setUnreadCount(count);
    } catch (error) {
      console.error("Error refreshing unread notifications:", error);
    }
  }, [db]);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refreshUnreadCount();
      }
    });

    return () => {
      sub.remove();
    };
  }, [refreshUnreadCount]);

  const value = useMemo(
    () => ({
      unreadCount,
      refreshUnreadCount,
    }),
    [refreshUnreadCount, unreadCount],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
