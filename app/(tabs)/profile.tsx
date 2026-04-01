import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ScreenContainer from "@/components/screen-container";
import { ThemePreference, useThemePreference } from "@/contexts/theme-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getUserProfile } from "@/services/user-profile";

export default function ProfileScreen() {
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [isThemeModalVisible, setIsThemeModalVisible] = useState(false);
  const [themeModalMounted, setThemeModalMounted] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const { preference, setPreference } = useThemePreference();
  const sheetAnim = useRef(new Animated.Value(600)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const profile = await getUserProfile();
      setUser({ name: profile?.name ?? "" });
    })();
  }, []);

  const themeOptions: {
    key: ThemePreference;
    label: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    {
      key: "system",
      label: "System",
      description: "Follow device appearance",
      icon: "phone-portrait-outline",
    },
    {
      key: "light",
      label: "Light",
      description: "Always use light theme",
      icon: "sunny-outline",
    },
    {
      key: "dark",
      label: "Dark",
      description: "Always use dark theme",
      icon: "moon-outline",
    },
  ];

  const selectedThemeLabel =
    themeOptions.find((option) => option.key === preference)?.label ?? "System";

  const handleSelectTheme = async (nextPreference: ThemePreference) => {
    await setPreference(nextPreference);
  };

  useEffect(() => {
    if (!isThemeModalVisible) {
      return;
    }

    setThemeModalMounted(true);
    sheetAnim.setValue(600);
    backdropAnim.setValue(0);

    Animated.parallel([
      Animated.spring(sheetAnim, {
        toValue: 0,
        damping: 28,
        stiffness: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropAnim, isThemeModalVisible, sheetAnim]);

  const closeThemeModal = () => {
    Animated.parallel([
      Animated.spring(sheetAnim, {
        toValue: 600,
        damping: 32,
        stiffness: 350,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setThemeModalMounted(false);
      setIsThemeModalVisible(false);
    });
  };

  return (
    <>
      <ScreenContainer
        header={
          <View className="px-5 py-4">
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Profile
            </Text>
          </View>
        }
      >
        <View className="items-center mt-10 px-6">
          <View className="w-24 h-24 rounded-full bg-sky-100 dark:bg-sky-900/40 items-center justify-center mb-6 border-4 border-white dark:border-gray-800 shadow-sm">
            <Ionicons name="person" size={48} color="#0ea5e9" />
          </View>
          <Text className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-1">
            {user?.name || "Guest User"}
          </Text>
          <Text className="text-gray-400 dark:text-gray-500 font-medium mb-6 uppercase tracking-widest text-[10px]">
            Personal Account
          </Text>

          <View className="w-full pt-6 gap-4">
            <TouchableOpacity
              onPress={() => router.push("/relationships")}
              className="flex-row items-center p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50"
            >
              <Ionicons
                name="people-outline"
                size={24}
                color="#0ea5e9"
                className="mr-4"
              />
              <Text className="text-base font-bold text-gray-700 dark:text-gray-300">
                People
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color="#d1d5db"
                className="ml-auto"
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setIsThemeModalVisible(true)}
              className="flex-row items-center rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-4"
            >
              <View className="flex-1">
                <Text className="text-base font-bold text-gray-700 dark:text-gray-300">
                  Theme
                </Text>
                <Text className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                  {selectedThemeLabel}
                  {preference === "system" ? " (default)" : ""} - currently{" "}
                  {colorScheme}
                </Text>
              </View>
              <Ionicons
                name="color-palette-outline"
                size={22}
                color={colorScheme === "dark" ? "#d1d5db" : "#6b7280"}
              />
              <Ionicons
                name="chevron-forward"
                size={18}
                color="#d1d5db"
                className="ml-3"
              />
            </TouchableOpacity>
          </View>
        </View>
      </ScreenContainer>

      {themeModalMounted ? (
        <View className="absolute inset-0 justify-end">
          <Animated.View
            style={{ opacity: backdropAnim }}
            className="absolute inset-0 bg-black/40"
          >
            <Pressable className="flex-1" onPress={closeThemeModal} />
          </Animated.View>

          <Animated.View
            style={{
              transform: [{ translateY: sheetAnim }],
              paddingBottom: Math.max(insets.bottom, 16) + 16,
            }}
            className="bg-white dark:bg-gray-950 rounded-t-[40px] px-5 pt-5 border-t border-gray-100 dark:border-gray-800 overflow-hidden"
          >
            <View className="w-12 h-1.5 rounded-full bg-gray-200 dark:bg-gray-800 self-center mb-5" />
            <View className="flex-row items-start justify-between mb-4">
              <View className="flex-1 pr-4">
                <Text className="text-xl font-black text-gray-900 dark:text-gray-100">
                  Choose Theme
                </Text>
                <Text className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Pick how the app should look.
                </Text>
              </View>
              <TouchableOpacity
                onPress={closeThemeModal}
                activeOpacity={0.8}
                className="w-10 h-10 rounded-full items-center justify-center bg-gray-100 dark:bg-gray-800"
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={colorScheme === "dark" ? "#d1d5db" : "#6b7280"}
                />
              </TouchableOpacity>
            </View>

            <View className="gap-2">
              {themeOptions.map((option) => {
                const isSelected = preference === option.key;

                return (
                  <TouchableOpacity
                    key={option.key}
                    onPress={() => handleSelectTheme(option.key)}
                    activeOpacity={0.85}
                    className={`flex-row items-center rounded-2xl border px-4 py-3 ${
                      isSelected
                        ? "border-sky-300 bg-sky-50 dark:border-sky-700 dark:bg-sky-900/30"
                        : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
                    }`}
                  >
                    <View
                      className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                        isSelected
                          ? "bg-sky-100 dark:bg-sky-900/50"
                          : "bg-white dark:bg-gray-800"
                      }`}
                    >
                      <Ionicons
                        name={option.icon}
                        size={18}
                        color={isSelected ? "#0ea5e9" : "#9ca3af"}
                      />
                    </View>

                    <View className="flex-1">
                      <Text
                        className={`text-sm font-bold ${
                          isSelected
                            ? "text-sky-700 dark:text-sky-300"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {option.label}
                        {option.key === "system" ? " (default)" : ""}
                      </Text>
                      <Text className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                        {option.description}
                      </Text>
                    </View>

                    <Ionicons
                      name={isSelected ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color={isSelected ? "#0ea5e9" : "#9ca3af"}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </View>
      ) : null}
    </>
  );
}
