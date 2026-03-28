import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useCustomers } from "@/hooks/use-customers";
import { useCreditors } from "@/hooks/use-creditors";

type ExistingType = "lend" | "mytab";

export default function QuickAddScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { customers } = useCustomers();
  const { creditors } = useCreditors();

  const [isClosing, setIsClosing] = useState(false);
  const [unmounted, setUnmounted] = useState(false);
  const [step, setStep] = useState(0); // 0 actions, 1 choose type, 2 list
  const [existingType, setExistingType] = useState<ExistingType>("lend");
  const slideAnim = useRef(new Animated.Value(600)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const contentX = useRef(new Animated.Value(0)).current;

  const allCreditors = useMemo(() => creditors, [creditors]);
  const creditorTemplates = useMemo(() => {
    const byName = new Map<string, (typeof creditors)[number]>();

    for (const creditor of creditors) {
      const normalizedName = creditor.name.trim().toLowerCase();
      if (!normalizedName || byName.has(normalizedName)) {
        continue;
      }
      byName.set(normalizedName, creditor);
    }

    return Array.from(byName.values());
  }, [creditors]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 28,
        stiffness: 300,
        useNativeDriver: false,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropAnim, slideAnim]);

  const animateStep = (nextStep: number) => {
    setStep(nextStep);
    Animated.spring(contentX, {
      toValue: -nextStep * width,
      damping: 28,
      stiffness: 300,
      // JS driver keeps touch hitboxes aligned while cards are still animating.
      useNativeDriver: false,
    }).start();
  };

  const close = () => {
    if (isClosing) return;
    setIsClosing(true);

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }

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

  const handleAddMyTab = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsClosing(true);
    setUnmounted(true);
    router.replace("/my-tab-modal");
  };

  const handleOpenExisting = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateStep(1);
  };

  const handleChooseType = (type: ExistingType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExistingType(type);
    animateStep(2);
  };

  const handleBackStep = () => {
    if (step <= 0) {
      close();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateStep(step - 1);
  };

  const handleSelectCustomer = (item: { id: number; name: string }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsClosing(true);
    setUnmounted(true);
    router.replace({
      pathname: "/add-lend",
      params: {
        customer_id: item.id.toString(),
        customer_name: item.name,
      },
    });
  };

  const handleSelectCreditor = (item: { id: number }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsClosing(true);
    setUnmounted(true);
    router.replace({
      pathname: "/my-tab-modal",
      params: { id: item.id.toString(), mode: "add_existing" },
    });
  };

  if (unmounted) return null;

  return (
    <View className="flex-1">
      <Animated.View
        style={{ opacity: backdropAnim }}
        className="absolute inset-0 bg-black/40"
      >
        <Pressable className="flex-1" onPress={close} />
      </Animated.View>

      <Animated.View
        style={{
          transform: [{ translateY: slideAnim }],
          paddingBottom: Math.max(insets.bottom, 16) + 24,
        }}
        className="absolute bottom-0 w-full bg-white dark:bg-gray-900 rounded-t-[40px] shadow-2xl border-t border-gray-100 dark:border-gray-800 overflow-hidden"
      >
        <View className="px-6 pt-6">
          <View className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-6" />
        </View>

        <Animated.View
          style={{
            width: width * 3,
            transform: [{ translateX: contentX }],
          }}
          className="flex-row"
        >
          <View style={{ width }} className="px-6">
            <Text className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-6 px-2">
              Quick Action
            </Text>
            <View className="gap-4 pb-2">
              {(customers.length > 0 || allCreditors.length > 0) && (
                <Pressable
                  onPress={handleOpenExisting}
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
                      Pick an existing list entry
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                </Pressable>
              )}

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
          </View>

          <View style={{ width }} className="px-6">
            <View className="flex-row items-center mb-6">
              <Pressable
                onPress={handleBackStep}
                className="w-10 h-10 items-center justify-center"
              >
                <Ionicons name="chevron-back" size={24} color="#9ca3af" />
              </Pressable>
              <Text className="text-xl font-black text-gray-900 dark:text-gray-100 ml-2">
                Add Existing
              </Text>
            </View>
            <View className="gap-4 pb-2">
              <Pressable
                onPress={() => handleChooseType("lend")}
                className="flex-row items-center p-5 rounded-[24px] bg-gray-50 dark:bg-gray-800/50 active:bg-gray-100 dark:active:bg-gray-800 border border-gray-100 dark:border-gray-800"
              >
                <View className="w-12 h-12 rounded-full items-center justify-center bg-sky-100 dark:bg-sky-900/40 mr-4">
                  <Ionicons name="cash-outline" size={24} color="#0ea5e9" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Add Lend
                  </Text>
                  <Text className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                    Choose from customer list
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
              </Pressable>

              <Pressable
                onPress={() => handleChooseType("mytab")}
                className="flex-row items-center p-5 rounded-[24px] bg-gray-50 dark:bg-gray-800/50 active:bg-gray-100 dark:active:bg-gray-800 border border-gray-100 dark:border-gray-800"
              >
                <View className="w-12 h-12 rounded-full items-center justify-center bg-orange-100 dark:bg-orange-900/40 mr-4">
                  <Ionicons name="wallet-outline" size={24} color="#f97316" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Add My Tab
                  </Text>
                  <Text className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                    Choose from your tab list
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
              </Pressable>
            </View>
          </View>

          <View style={{ width }} className="px-6">
            <View className="flex-row items-center mb-4">
              <Pressable
                onPress={handleBackStep}
                className="w-10 h-10 items-center justify-center"
              >
                <Ionicons name="chevron-back" size={24} color="#9ca3af" />
              </Pressable>
              <Text className="text-xl font-black text-gray-900 dark:text-gray-100 ml-2">
                {existingType === "lend"
                  ? "Select Customer"
                  : "Select Creditor"}
              </Text>
            </View>

            {existingType === "lend" ? (
              <FlatList
                data={customers}
                keyExtractor={(item) => `customer-${item.id}`}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 8 }}
                ListEmptyComponent={
                  <View className="items-center py-10">
                    <Text className="text-gray-400 dark:text-gray-500">
                      No customers found.
                    </Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => handleSelectCustomer(item)}
                    className="flex-row items-center p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 mb-2"
                  >
                    <View className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-900/40 items-center justify-center mr-3">
                      <Text className="text-sky-500 font-black">
                        {item.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text className="flex-1 text-base font-bold text-gray-900 dark:text-gray-100">
                      {item.name}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#9ca3af"
                    />
                  </Pressable>
                )}
              />
            ) : (
              <FlatList
                data={creditorTemplates}
                keyExtractor={(item) => `creditor-${item.id}`}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 8 }}
                ListEmptyComponent={
                  <View className="items-center py-10">
                    <Text className="text-gray-400 dark:text-gray-500">
                      No tabs found.
                    </Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => handleSelectCreditor(item)}
                    className="flex-row items-center p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 mb-2"
                  >
                    <View className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/40 items-center justify-center mr-3">
                      <Text className="text-orange-500 font-black">
                        {item.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text className="flex-1 text-base font-bold text-gray-900 dark:text-gray-100">
                      {item.name}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#9ca3af"
                    />
                  </Pressable>
                )}
              />
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
