import { Tabs, useRouter } from "expo-router";
import React, { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { HapticTab } from "@/components/haptic-tab";
import { Colors } from "@/constants/theme";
import { useNotifications } from "@/contexts/notifications-context";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? "light"];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotifications();
  const tabBarBottomOffset = 0;
  const tabBarHeight = 64 + insets.bottom;
  const sceneBottomPadding = tabBarHeight + 8;
  const sceneBackgroundColor = themeColors.background;
  const tabBarBackgroundColor =
    colorScheme === "dark"
      ? "rgba(21, 23, 24, 0.96)"
      : "rgba(255, 255, 255, 0.96)";
  const tabBarBorderColor =
    colorScheme === "dark"
      ? "rgba(39, 39, 42, 0.9)"
      : "rgba(229, 231, 235, 0.95)";
  const handleQuickAddPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push("/quick-add");
  }, [router]);

  const screenOptions = useMemo(
    () => ({
      tabBarActiveTintColor: themeColors.tint,
      tabBarInactiveTintColor: colorScheme === "dark" ? "#9ca3af" : "#6b7280",
      headerShown: false,
      tabBarButton: HapticTab,
      tabBarItemStyle: {
        borderRadius: 16,
        marginHorizontal: 2,
      },
      sceneStyle: {
        backgroundColor: sceneBackgroundColor,
        paddingBottom: sceneBottomPadding,
      },
      tabBarStyle: {
        position: "absolute" as const,
        left: 0,
        right: 0,
        bottom: tabBarBottomOffset,
        height: tabBarHeight,
        paddingBottom: Math.max(insets.bottom, 8),
        paddingTop: 8,
        backgroundColor: "transparent",
        shadowOpacity: 0,
        shadowRadius: 0,
        shadowOffset: { width: 0, height: 0 },
        elevation: 0,
        borderTopWidth: 0,
      },
      tabBarBackground: () => (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: tabBarBackgroundColor,
              borderTopWidth: 1,
              borderTopColor: tabBarBorderColor,
            },
          ]}
        />
      ),
      tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: "800" as const,
        textTransform: "uppercase" as const,
        letterSpacing: 0.5,
      },
    }),
    [
      colorScheme,
      sceneBottomPadding,
      sceneBackgroundColor,
      tabBarBackgroundColor,
      tabBarBorderColor,
      tabBarBottomOffset,
      tabBarHeight,
      insets.bottom,
      themeColors.tint,
    ],
  );

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={24}
              name={focused ? "home" : "home-outline"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifs",
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={24}
              name={focused ? "notifications" : "notifications-outline"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "Add",
          tabBarButton: (props) => (
            <HapticTab {...props} onPress={handleQuickAddPress} />
          ),
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center">
              <Ionicons
                size={29}
                name={focused ? "add-circle" : "add-circle-outline"}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: "Logs",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={24}
              name={focused ? "journal" : "journal-outline"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={24}
              name={focused ? "person" : "person-outline"}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
