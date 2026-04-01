import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import * as NavigationBar from "expo-navigation-bar";
import * as Notifications from "expo-notifications";
import * as SystemUI from "expo-system-ui";
import { Stack } from "expo-router";
import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import React, {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import {
  ActivityIndicator,
  AppState,
  Platform,
  Text,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import "../global.css";

import { AuthContext } from "@/contexts/auth-context";
import {
  NotificationsProvider,
  useNotifications,
} from "@/contexts/notifications-context";
import { ThemeProvider as AppThemeProvider } from "@/contexts/theme-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { migrateDbIfNeeded } from "@/services/database";
import {
  evaluateDueReminders,
  requestNotificationPermission,
} from "@/services/notifications";
import { SheetProvider } from "react-native-sheet-transitions";
import { useRouter } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

class DatabaseErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    if (
      Platform.OS === "web" &&
      error?.message?.includes("createSyncAccessHandle")
    )
      return { hasError: true };
    throw error;
  }
  componentDidCatch(error: Error) {
    if (
      Platform.OS === "web" &&
      error?.message?.includes("createSyncAccessHandle")
    ) {
      setTimeout(() => this.setState({ hasError: false }), 500);
    }
  }
  render() {
    if (this.state.hasError)
      return (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 12, color: "#888" }}>
            Reconnecting to database…
          </Text>
        </View>
      );
    return this.props.children;
  }
}

function NotificationBootstrap({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const db = useSQLiteContext();
  const { refreshUnreadCount } = useNotifications();
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    requestNotificationPermission().catch((error) => {
      console.error("Error requesting notification permission:", error);
    });
    evaluateDueReminders(db)
      .then(() => refreshUnreadCount())
      .catch((error) => {
        console.error("Error evaluating due reminders:", error);
      });
  }, [db, refreshUnreadCount]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;

      evaluateDueReminders(db)
        .then(() => refreshUnreadCount())
        .catch((error) => {
          console.error("Error evaluating due reminders:", error);
        });
    });

    return () => {
      sub.remove();
    };
  }, [db, refreshUnreadCount]);

  useEffect(() => {
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as Record<
          string,
          string
        >;
        const pathname = data?.pathname;
        if (!pathname) {
          return;
        }

        const params = Object.fromEntries(
          Object.entries(data).filter(
            ([key, value]) =>
              key !== "pathname" &&
              key !== "entityType" &&
              key !== "referenceCode" &&
              value,
          ),
        );

        router.push({
          pathname,
          params,
        });
      });

    return () => {
      responseListener.current?.remove();
      responseListener.current = null;
    };
  }, [router]);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  return <>{children}</>;
}

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const markProfileReady = useCallback(() => {}, []);
  const backgroundColor = colorScheme === "dark" ? "#151718" : "#ffffff";

  useLayoutEffect(() => {
    const applySystemTheme = async () => {
      const isDark = colorScheme === "dark";

      if (Platform.OS !== "android") {
        try {
          await SystemUI.setBackgroundColorAsync(backgroundColor);
        } catch (error) {
          console.error("Failed to update system background color:", error);
        }
        return;
      }

      try {
        await NavigationBar.setButtonStyleAsync(isDark ? "light" : "dark");
      } catch (error) {
        console.error("Failed to update Android navigation bar:", error);
      }
    };

    applySystemTheme();
  }, [backgroundColor, colorScheme]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor }}>
      <AuthContext.Provider value={{ markProfileReady }}>
        <DatabaseErrorBoundary>
          <Suspense
            fallback={
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor,
                }}
              >
                <ActivityIndicator size="large" color="#0ea5e9" />
              </View>
            }
          >
            <SQLiteProvider
              databaseName="tabtracker.db"
              onInit={migrateDbIfNeeded}
              useSuspense
            >
              <NotificationsProvider>
                <NotificationBootstrap>
                  <ThemeProvider
                    value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
                  >
                    <SheetProvider>
                      <Stack
                        screenOptions={{
                          headerShown: false,
                          animation: "slide_from_right",
                          fullScreenGestureEnabled: true,
                          gestureEnabled: true,
                          presentation: "card",
                        }}
                      >
                        <Stack.Screen
                          name="index"
                          options={{ animation: "none" }}
                        />
                        <Stack.Screen
                          name="welcome"
                          options={{ animation: "fade", gestureEnabled: false }}
                        />
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen name="modal" />
                        <Stack.Screen
                          name="my-tab-modal"
                          options={{ presentation: "modal" }}
                        />
                        <Stack.Screen name="add-customer" />
                        <Stack.Screen name="add-lend" />
                        <Stack.Screen name="select-customer" />
                        <Stack.Screen
                          name="quick-add"
                          options={{
                            presentation: "transparentModal",
                            animation: "fade",
                          }}
                        />
                        <Stack.Screen name="customer/[id]" />
                        <Stack.Screen name="creditor/[id]" />
                        <Stack.Screen name="relationships" />
                      </Stack>
                    </SheetProvider>
                    <StatusBar
                      animated={false}
                      backgroundColor={backgroundColor}
                      style={colorScheme === "dark" ? "light" : "dark"}
                    />
                  </ThemeProvider>
                </NotificationBootstrap>
              </NotificationsProvider>
            </SQLiteProvider>
          </Suspense>
        </DatabaseErrorBoundary>
      </AuthContext.Provider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <RootLayoutContent />
    </AppThemeProvider>
  );
}
