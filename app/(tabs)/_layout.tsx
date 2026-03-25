import { Tabs, useRouter } from "expo-router";
import React, { useCallback } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { HapticTab } from "@/components/haptic-tab";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? "light"];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarBottomOffset = insets.bottom + 12;
  const tabBarHeight = 64;
  const sceneBottomPadding = tabBarHeight + tabBarBottomOffset;
  const handleQuickAddPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push("/quick-add");
  }, [router]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: themeColors.tint,
        tabBarInactiveTintColor: colorScheme === "dark" ? "#9ca3af" : "#6b7280",
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarItemStyle: {
          borderRadius: 16,
          marginHorizontal: 2,
        },
        sceneStyle: {
          paddingBottom: sceneBottomPadding,
        },
        tabBarStyle: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: tabBarBottomOffset,
          height: tabBarHeight,
          paddingBottom: 8,
          paddingTop: 8,
          backgroundColor: "transparent",
          shadowOpacity: 0,
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 0 },
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "800",
          textTransform: "uppercase",
          letterSpacing: 0.5,
        },
      }}
    >
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
