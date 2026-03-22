import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '@/components/screen-container';

export default function NotificationsScreen() {
  return (
    <ScreenContainer header={<View className="px-5 py-4"><Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">Notifications</Text></View>}>
      <View className="flex-1 items-center justify-center p-10">
        <Ionicons name="notifications-outline" size={64} color="#d1d5db" />
        <Text className="text-gray-400 mt-4 text-center">No new notifications.</Text>
      </View>
    </ScreenContainer>
  );
}
