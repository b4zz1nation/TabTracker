import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  Keyboard,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { useCreditors } from "@/hooks/use-creditors";
import { getReferenceLabel } from "@/services/reference";

export default function CreditorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const creditorId = Number(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();

  const {
    creditors,
    refresh: refreshCreditors,
    getPayments,
    addPayment,
    completeCreditor,
  } = useCreditors();
  const [creditorPayments, setCreditorPayments] = useState<
    { id: number; amount: number; created_at: string; creditor_id: number }[]
  >([]);

  const [sheetMounted, setSheetMounted] = useState(false);
  const sheetAnim = useRef(new Animated.Value(600)).current;
  const sheetBackdropAnim = useRef(new Animated.Value(0)).current;

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const paymentSlideAnim = useRef(new Animated.Value(600)).current;
  const paymentBackdropAnim = useRef(new Animated.Value(0)).current;
  const keyboardOffset = useRef(new Animated.Value(0)).current;

  const [isExpanded, setIsExpanded] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;

  const creditor = useMemo(
    () => creditors.find((creditorItem) => creditorItem.id === creditorId),
    [creditorId, creditors],
  );

  const refreshAll = useCallback(async () => {
    refreshCreditors();
    const payments = await getPayments(creditorId);
    setCreditorPayments(payments);
  }, [refreshCreditors, getPayments, creditorId]);

  useFocusEffect(
    useCallback(() => {
      refreshAll();
    }, [refreshAll]),
  );

  const currentBalance = useMemo(() => creditor?.balance || 0, [creditor]);
  const totalPaid = useMemo(
    () => creditorPayments.reduce((sum, payment) => sum + payment.amount, 0),
    [creditorPayments],
  );
  const originalPrincipal = useMemo(
    () => currentBalance + totalPaid,
    [currentBalance, totalPaid],
  );

  const openSheet = useCallback(() => {
    setSheetMounted(true);
    sheetAnim.setValue(600);
    sheetBackdropAnim.setValue(0);
    Animated.parallel([
      Animated.spring(sheetAnim, {
        toValue: 0,
        damping: 28,
        stiffness: 300,
        useNativeDriver: true,
      }),
      Animated.timing(sheetBackdropAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [sheetAnim, sheetBackdropAnim]);

  const closeSheet = useCallback(
    (cb?: () => void) => {
      Animated.parallel([
        Animated.spring(sheetAnim, {
          toValue: 600,
          damping: 32,
          stiffness: 350,
          useNativeDriver: true,
        }),
        Animated.timing(sheetBackdropAnim, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setSheetMounted(false);
        cb?.();
      });
    },
    [sheetAnim, sheetBackdropAnim],
  );

  const closePaymentModal = useCallback(
    (cb?: () => void) => {
      Keyboard.dismiss();
      Animated.parallel([
        Animated.spring(paymentSlideAnim, {
          toValue: 600,
          damping: 32,
          stiffness: 350,
          useNativeDriver: true,
        }),
        Animated.timing(paymentBackdropAnim, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setPaymentModalVisible(false);
        setPaymentAmount("");
        setPaymentError(null);
        cb?.();
      });
    },
    [paymentSlideAnim, paymentBackdropAnim],
  );

  const openPaymentModal = useCallback(() => {
    setPaymentError(null);
    setPaymentAmount("");
    setPaymentModalVisible(true);
    paymentSlideAnim.setValue(600);
    paymentBackdropAnim.setValue(0);
    Animated.parallel([
      Animated.spring(paymentSlideAnim, {
        toValue: 0,
        damping: 28,
        stiffness: 300,
        useNativeDriver: true,
      }),
      Animated.timing(paymentBackdropAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [paymentSlideAnim, paymentBackdropAnim]);

  React.useEffect(() => {
    if (!paymentModalVisible) return;

    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      const keyboardHeight = event.endCoordinates.height;
      const overlap = Math.min(keyboardHeight + 24, keyboardHeight + 40);
      Animated.timing(keyboardOffset, {
        toValue: -overlap,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [paymentModalVisible, keyboardOffset]);

  const toggleHistory = useCallback(() => {
    const toValue = isExpanded ? 0 : 1;
    Animated.spring(expandAnim, {
      toValue,
      damping: 26,
      stiffness: 280,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) setIsExpanded(!isExpanded);
    });
  }, [isExpanded, expandAnim]);

  const handleEdit = useCallback(() => {
    closeSheet(() => {
      router.push({
        pathname: "/my-tab-modal",
        params: { id: creditorId.toString() },
      });
    });
  }, [closeSheet, router, creditorId]);

  const handleAddPayment = useCallback(() => {
    closeSheet(() => openPaymentModal());
  }, [closeSheet, openPaymentModal]);

  const handleViewDetails = useCallback(() => {
    if (!creditor) return;
    closeSheet(() => {
      router.push(`/my-tab-details/${creditor.id}`);
    });
  }, [closeSheet, creditor, router]);

  const handleComplete = useCallback(async () => {
    if (!creditor) return;
    await completeCreditor(creditor.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeSheet(() => refreshAll());
  }, [closeSheet, completeCreditor, creditor, refreshAll]);

  const handleConfirmPayment = useCallback(async () => {
    if (!creditor) return;
    const payAmount = parseFloat(paymentAmount);
    if (Number.isNaN(payAmount) || payAmount <= 0) {
      setPaymentError("Enter a valid payment amount.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (payAmount > currentBalance) {
      setPaymentError(
        `Amount exceeds balance of ₱${currentBalance.toFixed(2)}`,
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    await addPayment(creditor.id, payAmount);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closePaymentModal(() => refreshAll());
  }, [
    addPayment,
    closePaymentModal,
    creditor,
    currentBalance,
    paymentAmount,
    refreshAll,
  ]);

  if (!creditor) {
    return (
      <SafeAreaView
        className="flex-1 bg-gray-50 dark:bg-gray-950"
        edges={["top"]}
      >
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Tab entry not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const bodyHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 400],
  });

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={["top"]}
    >
      <View className="px-5 pt-3 pb-6 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900">
        <Pressable onPress={() => router.back()} className="mb-2">
          <Ionicons
            name="chevron-back"
            size={28}
            color={colorScheme === "dark" ? "#fff" : "#1f2937"}
          />
        </Pressable>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="w-12 h-12 rounded-full bg-orange-500 items-center justify-center mr-3">
              <Text className="text-white font-bold text-lg">
                {(creditor.name || "T").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text className="text-[10px] text-gray-400 uppercase font-black">
                My Tab
              </Text>
              <Text className="text-xl font-black text-gray-900 dark:text-gray-100">
                {creditor.name}
              </Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-[9px] text-gray-400 uppercase font-black">
              Outstanding
            </Text>
            <Text className="text-xl font-black text-orange-500">
              ₱{currentBalance.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      <View className="pt-4">
        <View
          className={`rounded-[32px] mx-4 mb-3 bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 ${
            currentBalance <= 0 ? "opacity-70" : ""
          }`}
        >
          <Pressable
            onPress={() => {
              if (currentBalance <= 0) {
                router.push({
                  pathname: "/my-tab-modal",
                  params: { id: creditor.id.toString(), readOnly: "true" },
                });
                return;
              }
              openSheet();
            }}
            className="p-6 active:opacity-70"
          >
            <View className="flex-row justify-between mb-2">
              <View>
                <Text
                  className={`${currentBalance <= 0 ? "text-sm line-through text-gray-400" : "text-xl font-black text-gray-900 dark:text-gray-100"}`}
                >
                  ₱{originalPrincipal.toFixed(2)}
                </Text>
                {currentBalance > 0 && (
                  <Text className="text-base font-black text-orange-500">
                    ₱{currentBalance.toFixed(2)}
                  </Text>
                )}
              </View>
              <View className="items-center justify-center">
                <Text
                  className={`text-[10px] font-black uppercase tracking-wider leading-none ${
                    currentBalance <= 0 ? "text-emerald-500" : "text-orange-500"
                  }`}
                >
                  {currentBalance <= 0 ? "Completed" : "Ongoing"}
                </Text>
              </View>
            </View>
            <View className="flex-row justify-between items-center mt-4">
              <Text className="text-[10px] text-gray-400 font-bold uppercase">
                Started {new Date(creditor.created_at).toLocaleDateString()}
              </Text>
              {currentBalance > 0 && creditorPayments.length > 0 && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleHistory();
                  }}
                  className="p-2"
                >
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#9ca3af"
                  />
                </Pressable>
              )}
              <Text className="text-[10px] text-gray-400 font-mono opacity-60">
                REF:{" "}
                {getReferenceLabel("tab", creditor.id, creditor.reference_code)}
              </Text>
            </View>
          </Pressable>
          {currentBalance > 0 && (
            <Animated.View
              style={{
                maxHeight: bodyHeight,
                opacity: expandAnim,
                overflow: "hidden",
              }}
            >
              <View className="px-5 pb-5 border-t border-gray-50 dark:border-gray-800 pt-4 gap-2">
                {creditorPayments.map((payment) => (
                  <View
                    key={payment.id}
                    className="flex-row items-center justify-between bg-gray-50 dark:bg-gray-800/40 p-3 rounded-2xl border border-gray-100 dark:border-gray-800"
                  >
                    <View className="flex-row items-center">
                      <Ionicons
                        name="cash-outline"
                        size={16}
                        color="#059669"
                        style={{ marginRight: 8 }}
                      />
                      <Text className="font-bold text-gray-900 dark:text-gray-100">
                        ₱{payment.amount.toFixed(2)}
                      </Text>
                    </View>
                    <Text className="text-[10px] text-gray-400">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}
        </View>

        {creditorPayments.length === 0 && (
          <View className="items-center mt-16">
            <Ionicons name="wallet-outline" size={40} color="#d1d5db" />
            <Text className="text-gray-400 dark:text-gray-500 mt-3">
              No payments yet.
            </Text>
          </View>
        )}
      </View>

      {sheetMounted && (
        <View className="absolute inset-0 z-[2000] justify-end">
          <Animated.View
            style={{ opacity: sheetBackdropAnim }}
            className="absolute inset-0 bg-black/50"
          >
            <Pressable className="flex-1" onPress={() => closeSheet()} />
          </Animated.View>
          <Animated.View
            style={{
              transform: [{ translateY: sheetAnim }],
              paddingBottom: Math.max(insets.bottom, 16) + 24,
            }}
            className="w-full bg-white dark:bg-gray-900 rounded-t-3xl p-6"
          >
            <View className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-6" />
            <View className="gap-3">
              <Pressable
                onPress={handleEdit}
                className="flex-row items-center p-4 rounded-2xl bg-gray-100 dark:bg-gray-800"
              >
                <Ionicons name="create-outline" size={20} color="#0ea5e9" />
                <Text className="ml-4 flex-1 font-semibold text-gray-900 dark:text-gray-100">
                  Edit
                </Text>
              </Pressable>
              <Pressable
                onPress={handleViewDetails}
                className="flex-row items-center p-4 rounded-2xl bg-gray-100 dark:bg-gray-800"
              >
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color="#0ea5e9"
                />
                <Text className="ml-4 flex-1 font-semibold text-gray-900 dark:text-gray-100">
                  View Details
                </Text>
              </Pressable>
              <Pressable
                onPress={handleAddPayment}
                className="flex-row items-center p-4 rounded-2xl bg-gray-100 dark:bg-gray-800"
              >
                <Ionicons name="cash-outline" size={20} color="#0ea5e9" />
                <Text className="ml-4 flex-1 font-semibold text-gray-900 dark:text-gray-100">
                  Add Payment
                </Text>
              </Pressable>
              <Pressable
                onPress={handleComplete}
                className="flex-row items-center p-4 rounded-2xl bg-gray-100 dark:bg-gray-800"
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#10b981"
                />
                <Text className="ml-4 flex-1 font-semibold text-gray-900 dark:text-gray-100">
                  Mark Complete
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      )}

      {paymentModalVisible && (
        <View className="absolute inset-0 z-[4000] justify-end">
          <Animated.View
            style={{ opacity: paymentBackdropAnim }}
            className="absolute inset-0 bg-black/40"
          >
            <Pressable className="flex-1" onPress={() => closePaymentModal()} />
          </Animated.View>
          <Animated.View
            style={{
              transform: [
                { translateY: paymentSlideAnim },
                { translateY: keyboardOffset },
              ],
              paddingBottom: Math.max(insets.bottom, 16) + 24,
            }}
            className="bg-white dark:bg-gray-900 rounded-t-[40px] px-6 pt-6 shadow-2xl border-t border-gray-100 dark:border-gray-800"
          >
            <View className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-8" />
            <Text className="text-2xl font-black text-center mb-2 text-gray-900 dark:text-gray-100">
              How much was paid?
            </Text>
            <Text className="text-center mb-6 text-gray-500">
              Balance:{" "}
              <Text className="text-sky-500 font-bold">
                ₱{currentBalance.toFixed(2)}
              </Text>
            </Text>

            {paymentError && (
              <View className="mb-3 rounded-2xl bg-rose-500/10 border border-rose-200 dark:border-rose-800 px-4 py-3">
                <Text className="text-rose-500 font-semibold text-sm text-center">
                  {paymentError}
                </Text>
              </View>
            )}

            <View className="relative">
              <View className="absolute left-6 top-1/2 -mt-4 z-10">
                <Text className="text-3xl font-black text-gray-400">₱</Text>
              </View>
              <TextInput
                keyboardType="decimal-pad"
                value={paymentAmount}
                onChangeText={(text) => {
                  setPaymentAmount(
                    text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"),
                  );
                  if (paymentError) setPaymentError(null);
                }}
                className={`bg-gray-50 dark:bg-gray-800/50 p-6 pl-14 rounded-3xl text-3xl font-black text-gray-900 dark:text-gray-100 border ${
                  paymentError
                    ? "border-rose-500"
                    : "border-gray-100 dark:border-gray-800"
                }`}
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View className="flex-row gap-4 mt-8">
              <Pressable
                onPress={() => closePaymentModal()}
                className="flex-1 p-5 rounded-3xl bg-gray-100 dark:bg-gray-800 items-center justify-center active:bg-gray-200"
              >
                <Text className="font-bold text-gray-400">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmPayment}
                className="flex-[1.5] p-5 rounded-3xl bg-sky-500 items-center justify-center shadow-lg active:opacity-90"
              >
                <Text className="font-bold text-white">Confirm</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}
