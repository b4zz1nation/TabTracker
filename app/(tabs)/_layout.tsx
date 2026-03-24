import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: themeColors.tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: themeColors.background,
          borderTopColor: colorScheme === 'dark' ? '#1f2937' : '#f3f4f6',
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
          paddingTop: 8,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '800',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={24} name={focused ? "home" : "home-outline"} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifs',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={24} name={focused ? "notifications" : "notifications-outline"} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarIcon: ({ color, focused }) => (
             <View className="items-center justify-center -mt-8">
               <View className="w-14 h-14 rounded-full bg-sky-500 items-center justify-center shadow-lg shadow-sky-500/50">
                   <Ionicons size={32} name="add" color="white" />
               </View>
             </View>
          ),
          tabBarLabel: () => null,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            router.push('/quick-add');
          },
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: 'Logs',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={24} name={focused ? "journal" : "journal-outline"} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={24} name={focused ? "person" : "person-outline"} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-tab"
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          tabBarButton: () => null,
        }}
      />
    </Tabs>
  );
}
