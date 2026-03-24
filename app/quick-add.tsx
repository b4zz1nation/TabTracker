import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, View, Text, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCustomers } from "@/hooks/use-customers";

export default function QuickAddScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { customers } = useRef(useCustomers()).current; // Use ref to avoid re-renders if just wanting static list, but actually better to just use it.
  const { customers: currentCustomers } = useCustomers();
  const [isClosing, setIsClosing] = useState(false);
  const [unmounted, setUnmounted] = useState(false);
  const slideAnim = useRef(new Animated.Value(600)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 28,
        stiffness: 300,
        useNativeDriver: false, // Must be false to allow taps mid-animation (updates hit-box)
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const close = () => {
    if (isClosing) return;
    setIsClosing(true);

    // Trigger navigation IMMEDIATELY so the navigator doesn't feel stuck
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }

    // Still run the slide-out
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 600,
        damping: 32,
        stiffness: 350,
        useNativeDriver: false,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setUnmounted(true);
    });
  };

  const handleAddNew = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsClosing(true);
    setUnmounted(true);
    router.replace("/add-customer");
  };

  const handleAddExisting = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsClosing(true);
    setUnmounted(true);
    router.replace("/select-customer");
  };

  const handleAddMyTab = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsClosing(true);
    setUnmounted(true);
    router.replace("/my-tab-modal");
  };

  if (unmounted) return null;

  return (
    <View className="flex-1">
      {/* Backdrop */}
      <Animated.View
        style={{ opacity: backdropAnim }}
        className="absolute inset-0 bg-black/40"
      >
        <Pressable className="flex-1" onPress={() => close()} />
      </Animated.View>

      {/* Sliding bottom sheet */}
      <Animated.View
        style={{
          transform: [{ translateY: slideAnim }],
          paddingBottom: Math.max(insets.bottom, 16) + 24,
        }}
        className="absolute bottom-0 w-full bg-white dark:bg-gray-900 rounded-t-[40px] px-6 pt-6 shadow-2xl border-t border-gray-100 dark:border-gray-800"
      >
        <View className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-8" />

        <Text className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-6 px-2">
          Quick Action
        </Text>

        <View className="gap-4">
          <Pressable
            onPress={handleAddNew}
            className="flex-row items-center p-5 rounded-[24px] bg-gray-50 dark:bg-gray-800/50 active:bg-gray-100 dark:active:bg-gray-800 border border-gray-100 dark:border-gray-800"
          >
            <View className="w-12 h-12 rounded-full items-center justify-center bg-sky-100 dark:bg-sky-900/40 mr-4">
              <Ionicons name="person-add" size={24} color="#0ea5e9" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Add New
              </Text>
              <Text className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                Create a new customer record
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </Pressable>

          {currentCustomers.length > 0 && (
            <Pressable
              onPress={handleAddExisting}
              className="flex-row items-center p-5 rounded-[24px] bg-gray-50 dark:bg-gray-800/50 active:bg-gray-100 dark:active:bg-gray-800 border border-gray-100 dark:border-gray-800"
            >
              <View className="w-12 h-12 rounded-full items-center justify-center bg-emerald-100 dark:bg-emerald-900/40 mr-4">
                <Ionicons name="people" size={24} color="#10b981" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Add Existing
                </Text>
                <Text className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                  Add a lend to someone you know
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </Pressable>
          )}

          <Pressable
            onPress={handleAddMyTab}
            className="flex-row items-center p-5 rounded-[24px] bg-gray-50 dark:bg-gray-800/50 active:bg-gray-100 dark:active:bg-gray-800 border border-gray-100 dark:border-gray-800"
          >
            <View className="w-12 h-12 rounded-full items-center justify-center bg-orange-100 dark:bg-orange-900/40 mr-4">
              <Ionicons name="wallet" size={24} color="#f97316" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Add My Tab
              </Text>
              <Text className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                Track a new tab you borrowed
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}
