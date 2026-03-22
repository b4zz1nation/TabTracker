import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, View, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCustomers } from '@/hooks/use-customers';

export default function QuickAddScreen() {
  const router = useRouter();
  const { customers } = useRef(useCustomers()).current; // Use ref to avoid re-renders if just wanting static list, but actually better to just use it.
  const { customers: currentCustomers } = useCustomers();
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const close = (cb?: () => void) => {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      router.back();
      if (cb) setTimeout(cb, 50);
    });
  };

  const handleAddNew = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    close(() => router.push('/add-customer'));
  };

  const handleAddExisting = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    close(() => router.push('/select-customer'));
  };

  return (
    <View className="flex-1">
      {/* Backdrop */}
      <Pressable 
        className="absolute inset-0 bg-black/40" 
        onPress={() => close()} 
      />
      
      {/* Sliding bottom sheet */}
      <Animated.View
        style={{ transform: [{ translateY: slideAnim }] }}
        className="absolute bottom-0 w-full bg-white dark:bg-gray-900 rounded-t-[40px] px-6 pt-6 pb-12 shadow-2xl border-t border-gray-100 dark:border-gray-800"
      >
        <View className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-8" />
        
        <Text className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-6 px-2">Quick Action</Text>

        <View className="gap-4">
          <Pressable 
            onPress={handleAddNew} 
            className="flex-row items-center p-5 rounded-[24px] bg-gray-50 dark:bg-gray-800/50 active:bg-gray-100 dark:active:bg-gray-800 border border-gray-100 dark:border-gray-800"
          >
            <View className="w-12 h-12 rounded-full items-center justify-center bg-sky-100 dark:bg-sky-900/40 mr-4">
              <Ionicons name="person-add" size={24} color="#0ea5e9" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">Add New</Text>
              <Text className="text-xs text-gray-400 dark:text-gray-500 font-medium">Create a new customer record</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </Pressable>

          {(currentCustomers.length > 0) && (
            <Pressable 
              onPress={handleAddExisting} 
              className="flex-row items-center p-5 rounded-[24px] bg-gray-50 dark:bg-gray-800/50 active:bg-gray-100 dark:active:bg-gray-800 border border-gray-100 dark:border-gray-800"
            >
              <View className="w-12 h-12 rounded-full items-center justify-center bg-emerald-100 dark:bg-emerald-900/40 mr-4">
                <Ionicons name="people" size={24} color="#10b981" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">Add Existing</Text>
                <Text className="text-xs text-gray-400 dark:text-gray-500 font-medium">Add a lend to someone you know</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </Pressable>
          )}
        </View>
      </Animated.View>
    </View>
  );
}
