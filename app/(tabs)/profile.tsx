import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import ScreenContainer from "@/components/screen-container";
import { getUserProfile } from "@/services/user-profile";

export default function ProfileScreen() {
  const [user, setUser] = useState<{ name: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const p = await getUserProfile();
      setUser({ name: p?.name ?? "" });
    })();
  }, []);

  return (
    <ScreenContainer
      header={
        <View className="px-5 py-4">
          <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Profile
          </Text>
        </View>
      }
    >
      <View className="items-center mt-10 p-6 bg-white dark:bg-gray-900 mx-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-800">
        <View className="w-24 h-24 rounded-full bg-sky-100 dark:bg-sky-900/40 items-center justify-center mb-6 border-4 border-white dark:border-gray-800 shadow-sm">
          <Ionicons name="person" size={48} color="#0ea5e9" />
        </View>
        <Text className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-1">
          {user?.name || "Guest User"}
        </Text>
        <Text className="text-gray-400 dark:text-gray-500 font-medium mb-6 uppercase tracking-widest text-[10px]">
          Personal Account
        </Text>

        <View className="w-full border-t border-gray-100 dark:border-gray-800 pt-6 gap-4">
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
          <TouchableOpacity className="flex-row items-center p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
            <Ionicons
              name="settings-outline"
              size={24}
              color="#9ca3af"
              className="mr-4"
            />
            <Text className="text-base font-bold text-gray-700 dark:text-gray-300">
              Settings
            </Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color="#d1d5db"
              className="ml-auto"
            />
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}
