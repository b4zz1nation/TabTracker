import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  TextInput,
  Pressable,
  View,
  Alert,
  Text,
  Switch,
  TouchableOpacity,
  Animated,
  Keyboard,
  Platform,
  findNodeHandle,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSQLiteContext } from "expo-sqlite";

import { useCustomers } from "@/hooks/use-customers";
import { useLends } from "@/hooks/use-lends";
import { useColorScheme } from "@/hooks/use-color-scheme";
import ScreenContainer from "@/components/screen-container";

export default function AddCustomerScreen() {
  const router = useRouter();
  const { customerId, lendId, readOnly } = useLocalSearchParams<{
    customerId?: string;
    lendId?: string;
    readOnly?: string;
  }>();
  const isEditing = !!lendId;
  const isReadOnly = readOnly === "true";
  const colorScheme = useColorScheme();

  const db = useSQLiteContext();
  const { refresh: refreshCustomers } = useCustomers();
  const { lends, refresh: refreshLends, getPayments } = useLends();

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [interestEnabled, setInterestEnabled] = useState(false);
  const [interestRate, setInterestRate] = useState("");
  const [interestType, setInterestType] = useState<
    "Daily" | "Monthly" | "Yearly"
  >("Monthly");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const scrollViewRef = useRef<any>(null);
  const interestInputRef = useRef<TextInput>(null);
  const interestSectionY = useRef(0);
  const footerTranslateY = useRef(new Animated.Value(0)).current;
  const keyboardVerticalOffset = Platform.OS === "ios" ? 40 : 20;
  const keyboardFooterGap = 18;
  const amountFocusOffset = Platform.OS === "ios" ? 370 : 330;
  const descriptionFocusOffset = Platform.OS === "ios" ? 320 : 280;
  const interestFocusOffset = Platform.OS === "ios" ? 420 : 380;

  // Receipt/History states
  const [payments, setPayments] = useState<any[]>([]);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const historyExpandAnim = useRef(new Animated.Value(0)).current;

  const [errors, setErrors] = useState<{
    name?: boolean;
    amount?: boolean;
    interest?: boolean;
  }>({});
  const [isDuplicate, setIsDuplicate] = useState(false);

  const toggleHistory = () => {
    const toValue = isHistoryExpanded ? 0 : 1;
    Animated.spring(historyExpandAnim, {
      toValue,
      tension: 50,
      friction: 8,
      useNativeDriver: false,
    }).start();
    setIsHistoryExpanded(!isHistoryExpanded);
  };

  const historyRotation = historyExpandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const historyHeight = historyExpandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 300],
  });

  const handleToggleInterest = (val: boolean) => {
    setInterestEnabled(val);
    if (val) {
      setTimeout(() => {
        scrollInterestSectionToTop();
        interestInputRef.current?.focus();
      }, 100);
    }
  };

  const [dates, setDates] = useState({ start: "", end: null as string | null });

  const interestAccumulated = useMemo(() => {
    if (!interestEnabled || !interestRate || !interestType || !dates.start)
      return 0;
    const start = new Date(dates.start);
    const end = dates.end ? new Date(dates.end) : new Date();
    const diff = end.getTime() - start.getTime();
    if (diff < 0) return 0;

    let intervals = 0;
    const dayMs = 1000 * 60 * 60 * 24;
    if (interestType === "Daily") {
      intervals = Math.floor(diff / dayMs);
    } else if (interestType === "Monthly") {
      intervals = Math.floor(diff / (dayMs * 30.4375));
    } else if (interestType === "Yearly") {
      intervals = Math.floor(diff / (dayMs * 365.25));
    }
    return parseFloat(amount) * (parseFloat(interestRate) / 100) * intervals;
  }, [amount, interestEnabled, interestRate, interestType, dates]);

  const totalToPay = parseFloat(amount) + interestAccumulated;

  const handleFocus = useCallback((reactNode: any, extraHeight?: number) => {
    const resolvedNode =
      typeof reactNode === "number" ? reactNode : findNodeHandle(reactNode);
    if (!resolvedNode) return;

    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToFocusedInput(resolvedNode, extraHeight);
    });
  }, []);

  const scrollInterestSectionToTop = useCallback(() => {
    const targetY = Math.max(0, interestSectionY.current - 48);
    scrollViewRef.current?.scrollToPosition?.(0, targetY, true);
  }, []);

  const handleAmountChange = (text: string) => {
    const sanitized = text.replace(/[^0-9.]/g, "").replace(/(\..*)\./, "$1");
    setAmount(sanitized);
  };

  const handleRateChange = (text: string) => {
    setInterestRate(text.replace(/[^0-9.]/g, "").replace(/(\..*)\./, "$1"));
  };

  useEffect(() => {
    if (lendId) {
      const lend = lends.find((l) => l.id === Number(lendId));
      if (lend) {
        setAmount(lend.amount.toString());
        setInterestEnabled(lend.interest_enabled === 1);
        setInterestRate(lend.interest_rate?.toString() || "");
        setInterestType(lend.interest_type || "Monthly");
        setDates({ start: lend.created_at, end: lend.completed_at });
        setDescription(lend.description || "");

        db.getFirstAsync<{ name: string }>(
          "SELECT name FROM customers WHERE id = ?",
          [lend.customer_id],
        ).then((res) => {
          if (res) setName(res.name);
        });

        if (isReadOnly) {
          getPayments(Number(lendId)).then(setPayments);
        }
      }
    } else if (customerId) {
      db.getFirstAsync<{ name: string }>(
        "SELECT name FROM customers WHERE id = ?",
        [Number(customerId)],
      ).then((res) => {
        if (res) setName(res.name);
      });
    }
  }, [lendId, lends, customerId, db]);

  useEffect(() => {
    if (isReadOnly) return;

    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const keyboardHeight = e.endCoordinates.height;
      const toValue = -Math.max(
        0,
        keyboardHeight - keyboardVerticalOffset + keyboardFooterGap,
      );
      Animated.spring(footerTranslateY, {
        toValue,
        damping: 28,
        stiffness: 300,
        useNativeDriver: true,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      Animated.spring(footerTranslateY, {
        toValue: 0,
        damping: 28,
        stiffness: 300,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [
    footerTranslateY,
    isReadOnly,
    keyboardVerticalOffset,
    keyboardFooterGap,
    scrollInterestSectionToTop,
  ]);

  const handleSave = async () => {
    if (isReadOnly) return;
    setErrors({});
    setIsDuplicate(false);

    const trimmedName = name.trim();
    const numAmount = parseFloat(amount);

    const errs: { name?: boolean; amount?: boolean } = {};
    if (!trimmedName) errs.name = true;
    if (isNaN(numAmount) || numAmount <= 0) errs.amount = true;

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      if (!isEditing && !customerId) {
        const existing = await db.getFirstAsync<{ id: number }>(
          "SELECT id FROM customers WHERE name = ? COLLATE NOCASE",
          [trimmedName],
        );
        if (existing) {
          setErrors({ name: true });
          setIsDuplicate(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }
      }

      if (interestEnabled) {
        const numRate = parseFloat(interestRate);
        if (isNaN(numRate) || numRate <= 0) {
          setErrors((prev) => ({ ...prev, interest: true }));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }
      }

      setIsSaving(true);
      if (isEditing) {
        await db.runAsync(
          "UPDATE lends SET amount = ?, interest_enabled = ?, interest_rate = ?, interest_type = ?, description = ? WHERE id = ?",
          [
            numAmount,
            interestEnabled ? 1 : 0,
            parseFloat(interestRate),
            interestType,
            description || null,
            Number(lendId),
          ],
        );
      } else if (customerId) {
        await db.runAsync(
          "INSERT INTO lends (customer_id, amount, status, interest_enabled, interest_rate, interest_type, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [
            Number(customerId),
            numAmount,
            "Ongoing",
            interestEnabled ? 1 : 0,
            parseFloat(interestRate),
            interestType,
            description || null,
            new Date().toISOString(),
          ],
        );
      } else {
        const result = await db.runAsync(
          "INSERT INTO customers (name, balance) VALUES (?, ?)",
          [trimmedName, numAmount],
        );
        const newCustomerId = result.lastInsertRowId;
        await db.runAsync(
          "INSERT INTO lends (customer_id, amount, status, interest_enabled, interest_rate, interest_type, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [
            newCustomerId,
            numAmount,
            "Ongoing",
            interestEnabled ? 1 : 0,
            parseFloat(interestRate),
            interestType,
            description || null,
            new Date().toISOString(),
          ],
        );
      }

      const cId = Number(
        customerId ||
          (isEditing
            ? lends.find((l) => l.id === Number(lendId))?.customer_id
            : null),
      );
      if (cId || !isEditing) {
        const targetId =
          cId ||
          (
            await db.getFirstAsync<{ id: number }>(
              "SELECT id FROM customers WHERE name = ? ORDER BY id DESC",
              [trimmedName],
            )
          )?.id;
        if (targetId) {
          const allLends = await db.getAllAsync<{ amount: number }>(
            "SELECT amount FROM lends WHERE customer_id = ? AND status = ?",
            [targetId, "Ongoing"],
          );
          const newBalance = allLends.reduce((sum, l) => sum + l.amount, 0);
          await db.runAsync("UPDATE customers SET balance = ? WHERE id = ?", [
            newBalance,
            targetId,
          ]);
        }
      }

      await refreshCustomers();
      await refreshLends();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)");
      }
    } catch (error: any) {
      console.error(error);
      if (error.message?.includes("UNIQUE")) {
        setErrors({ name: true });
        setIsDuplicate(true);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const header = (
    <View className="flex-row items-center justify-between px-2 py-3">
      <TouchableOpacity
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace("/(tabs)");
          }
        }}
        activeOpacity={0.6}
        className="w-12 h-12 items-center justify-center"
      >
        <Ionicons
          name="chevron-back"
          size={28}
          color={colorScheme === "dark" ? "#ffffff" : "#1f2937"}
        />
      </TouchableOpacity>
      <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 italic">
        {isEditing ? (isReadOnly ? "Lend Receipt" : "Edit Lend") : "New Entry"}
      </Text>
      <View className="w-12" />
    </View>
  );

  const isFormValid =
    name.trim() !== "" && amount.trim() !== "" && !isNaN(parseFloat(amount));

  const footer = !isReadOnly ? (
    <View className="px-6 py-4">
      <Pressable
        className={`h-16 rounded-2xl items-center justify-center shadow-lg ${!isFormValid ? "bg-gray-100 dark:bg-gray-800" : isSaving ? "bg-sky-400" : "bg-sky-500 shadow-sky-500/30 active:opacity-90 active:scale-[0.98]"}`}
        onPress={handleSave}
        disabled={isSaving || !isFormValid}
      >
        <Text
          className={`text-lg font-bold ${!isFormValid ? "text-gray-400 dark:text-gray-600" : "text-white"}`}
        >
          {isSaving
            ? "Saving..."
            : isEditing
              ? "Save Changes"
              : "Add Customer & Lend"}
        </Text>
      </Pressable>
    </View>
  ) : null;

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-sky-400",
      "bg-emerald-400",
      "bg-violet-400",
      "bg-amber-400",
      "bg-rose-400",
      "bg-teal-400",
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (isReadOnly) {
    const formatDate = (d: string | null) =>
      d
        ? new Date(d).toLocaleDateString(undefined, { dateStyle: "long" })
        : "N/A";

    const historyTotal = payments.reduce((sum, p) => sum + p.amount, 0);
    const displayAmount = isEditing
      ? historyTotal > 0
        ? historyTotal
        : parseFloat(amount)
      : parseFloat(amount);

    return (
      <View className="flex-1">
        <ScreenContainer
          header={header}
          edges={["top", "bottom"]}
          scrollable={true}
          centerContent={true}
        >
          <View className="bg-white dark:bg-gray-900 rounded-[32px] p-6 mx-6 shadow-2xl border border-gray-100 dark:border-gray-800 mb-20 mt-4">
            <View className="items-center mb-6">
              <View className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 items-center justify-center mb-3">
                <Ionicons name="checkmark-circle" size={40} color="#10b981" />
              </View>
              <Text className="text-xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-tight">
                Payment Settled
              </Text>
              <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-mono mt-1 opacity-60">
                REF: #{lendId?.padStart(6, "0")}
              </Text>
            </View>

            <View className="border-t border-b border-dashed border-gray-200 dark:border-zinc-800 py-6 my-1 gap-4">
              <View className="flex-row justify-between">
                <Text className="text-gray-400 dark:text-gray-500 font-medium text-sm">
                  Customer
                </Text>
                <Text className="text-gray-900 dark:text-gray-100 font-bold text-base">
                  {name}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-400 dark:text-gray-500 font-medium text-sm">
                  Principal Paid
                </Text>
                <Text className="text-gray-900 dark:text-gray-100 font-bold text-base">
                  ₱{displayAmount.toFixed(2)}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-400 dark:text-gray-500 font-medium text-sm">
                  Interest Rate
                </Text>
                <Text className="text-gray-900 dark:text-gray-100 font-bold text-sm">
                  {interestEnabled
                    ? `${interestRate}% / ${interestType}`
                    : "0%"}
                </Text>
              </View>
              {interestAccumulated > 0 && (
                <View className="flex-row justify-between">
                  <Text className="text-gray-400 dark:text-gray-500 font-medium text-sm">
                    Accumulated
                  </Text>
                  <Text className="text-emerald-500 font-bold text-base">
                    + ₱{interestAccumulated.toFixed(2)}
                  </Text>
                </View>
              )}
            </View>

            {isEditing &&
              lends.find((l) => l.id === Number(lendId))?.description && (
                <View className="mt-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <Text className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest mb-1.5 ml-1">
                    Description
                  </Text>
                  <Text className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic">
                    "{lends.find((l) => l.id === Number(lendId))?.description}"
                  </Text>
                </View>
              )}

            {/* Collapsible History Section */}
            {payments.length > 0 && (
              <View className="mt-4">
                <Pressable
                  onPress={toggleHistory}
                  className="flex-row items-center justify-between py-3 px-1 active:opacity-60"
                >
                  <Text className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-[2px]">
                    Payment History
                  </Text>
                  <Animated.View
                    style={{ transform: [{ rotate: historyRotation }] }}
                  >
                    <Ionicons name="chevron-down" size={14} color="#9ca3af" />
                  </Animated.View>
                </Pressable>

                <Animated.View
                  style={{
                    maxHeight: historyHeight,
                    opacity: historyExpandAnim,
                    overflow: "hidden",
                  }}
                >
                  <View className="gap-2 pt-1 pb-2">
                    {payments.map((p, i) => (
                      <View
                        key={p.id}
                        className="flex-row items-center justify-between bg-gray-50 dark:bg-gray-800/40 p-3 rounded-2xl"
                      >
                        <View className="flex-row items-center">
                          <View className="w-7 h-7 rounded-full bg-emerald-100/50 dark:bg-emerald-900/20 items-center justify-center mr-3">
                            <Ionicons
                              name="cash-outline"
                              size={12}
                              color="#10b981"
                            />
                          </View>
                          <View>
                            <Text className="text-gray-900 dark:text-gray-100 font-bold text-xs">
                              ₱{p.amount.toFixed(2)}
                            </Text>
                            <Text className="text-[8px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-tighter">
                              {new Date(p.created_at).toLocaleDateString()}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-[8px] text-sky-500 font-black uppercase tracking-widest">
                          Partial
                        </Text>
                      </View>
                    ))}
                  </View>
                </Animated.View>
              </View>
            )}

            <View className="py-4 mt-2 gap-3">
              <View className="flex-row justify-between items-center px-1">
                <View>
                  <Text className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest mb-1">
                    Issue Date
                  </Text>
                  <Text className="text-gray-700 dark:text-gray-300 font-bold text-[10px]">
                    {formatDate(dates.start)}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={12} color="#d1d5db" />
                <View className="items-end">
                  <Text className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest mb-1">
                    Settled Date
                  </Text>
                  <Text className="text-gray-700 dark:text-gray-300 font-bold text-[10px]">
                    {formatDate(dates.end)}
                  </Text>
                </View>
              </View>
            </View>

            <View className="border-t-2 border-gray-100 dark:border-zinc-800 pt-6 mt-1 items-center">
              <Text className="text-gray-400 dark:text-gray-500 uppercase text-[10px] font-black tracking-[3px] mb-1">
                Total Settled
              </Text>
              <Text className="text-4xl font-black text-gray-900 dark:text-gray-100">
                ₱{(historyTotal + interestAccumulated).toFixed(2)}
              </Text>
            </View>
          </View>
        </ScreenContainer>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <ScreenContainer
        scrollViewRef={scrollViewRef}
        header={header}
        footer={footer}
        footerContainerStyle={
          !isReadOnly
            ? { transform: [{ translateY: footerTranslateY }] }
            : undefined
        }
        edges={["top", "bottom"]}
        extraHeight={260}
        contentContainerStyle={{ padding: 24 }}
      >
        <View className="mb-10">
          {isEditing || customerId ? (
            <View className="flex-row items-center px-1">
              <View
                className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${getAvatarColor(name || "C")}`}
              >
                <Text className="text-white font-bold text-base">
                  {(name || "C").charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest font-semibold">
                  Lending to
                </Text>
                <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {name}
                </Text>
              </View>
            </View>
          ) : (
            <View className="flex-row gap-3">
              <View className="flex-[1.3]">
                <View className="flex-row items-center justify-between mb-2 ml-1">
                  <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                    Customer Name
                  </Text>
                  {isDuplicate && (
                    <Text className="text-[10px] text-red-500 font-black uppercase italic mr-1">
                      Already Taken!
                    </Text>
                  )}
                </View>
                <TextInput
                  className={`h-14 px-4 rounded-2xl border ${errors.name ? "border-red-500 bg-red-50/50 dark:bg-red-950/20" : "border-gray-200 dark:border-gray-800"} bg-white dark:bg-gray-900 text-lg text-gray-900 dark:text-gray-100 shadow-sm`}
                  placeholder="Name"
                  placeholderTextColor="#9ca3af"
                  value={name}
                  onChangeText={(t) => {
                    setName(t);
                    setErrors((prev) => ({ ...prev, name: false }));
                    setIsDuplicate(false);
                  }}
                  onFocus={(event) => handleFocus(event.target)}
                  autoFocus={!isReadOnly}
                  editable={!isReadOnly && !customerId && !isEditing}
                />
              </View>

              <View className="flex-1">
                <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">
                  Amount Owed
                </Text>
                <View
                  className={`flex-row items-center bg-white dark:bg-gray-900 rounded-2xl border ${errors.amount ? "border-red-500 bg-red-50/50 dark:bg-red-950/20" : "border-gray-200 dark:border-gray-800"} px-4 shadow-sm`}
                >
                  <TextInput
                    className="flex-1 h-14 text-2xl font-bold text-gray-900 dark:text-gray-100"
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    value={amount}
                    onChangeText={(t) => {
                      handleAmountChange(t);
                      setErrors((prev) => ({ ...prev, amount: false }));
                    }}
                    onFocus={(event) => handleFocus(event.target)}
                    keyboardType="numeric"
                    editable={!isReadOnly}
                  />
                </View>
              </View>
            </View>
          )}
        </View>

        {isEditing || customerId ? (
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">
              Amount Owed
            </Text>
            <View
              className={`flex-row items-center bg-white dark:bg-gray-900 rounded-2xl border ${errors.amount ? "border-red-500 bg-red-50/50 dark:bg-red-950/20" : "border-gray-200 dark:border-gray-800"} px-4 shadow-sm`}
            >
              <Text className="text-2xl font-bold text-gray-400 mr-2">₱</Text>
              <TextInput
                className="flex-1 h-16 text-3xl font-bold text-gray-900 dark:text-gray-100"
                placeholder="0"
                placeholderTextColor="#9ca3af"
                value={amount}
                onChangeText={(t) => {
                  handleAmountChange(t);
                  setErrors((prev) => ({ ...prev, amount: false }));
                }}
                onFocus={(event) =>
                  handleFocus(event.target, amountFocusOffset)
                }
                keyboardType="numeric"
                editable={!isReadOnly}
              />
            </View>
          </View>
        ) : null}

        {!isReadOnly && (
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">
              Description (Optional)
            </Text>
            <View className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 px-4 py-3 shadow-sm min-h-[100px]">
              <TextInput
                className="text-lg text-gray-900 dark:text-gray-100 min-h-[80px]"
                placeholder="What's this for?"
                placeholderTextColor="#9ca3af"
                value={description}
                onChangeText={setDescription}
                onFocus={(event) =>
                  handleFocus(event.target, descriptionFocusOffset)
                }
                multiline={true}
                textAlignVertical="top"
                maxLength={100}
              />
              <Text className="text-[10px] text-gray-400 dark:text-gray-500 text-right mt-1">
                {description.length}/100
              </Text>
            </View>
          </View>
        )}

        <View className="mb-0 p-5 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-md">
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center">
              <View
                className={`w-10 h-10 rounded-full ${!name.trim() || !amount.trim() ? "bg-gray-100 dark:bg-zinc-800" : "bg-sky-100 dark:bg-sky-900/40"} items-center justify-center mr-3`}
              >
                <Ionicons
                  name="trending-up"
                  size={20}
                  color={!name.trim() || !amount.trim() ? "#9ca3af" : "#0ea5e9"}
                />
              </View>
              <Text
                className={`text-base font-bold ${!name.trim() || !amount.trim() ? "text-gray-300 dark:text-gray-600" : "text-gray-900 dark:text-gray-100"}`}
              >
                Interest Rate
              </Text>
            </View>
            <Switch
              value={interestEnabled}
              onValueChange={!isReadOnly ? handleToggleInterest : undefined}
              trackColor={{ false: "#e5e7eb", true: "#bae6fd" }}
              thumbColor={interestEnabled ? "#0ea5e9" : "#f3f4f6"}
              disabled={isReadOnly || !name.trim() || !amount.trim()}
            />
          </View>

          <View
            className={`gap-6 ${interestEnabled && name.trim() && amount.trim() ? "opacity-100" : "opacity-45"}`}
            onLayout={(event) => {
              interestSectionY.current = event.nativeEvent.layout.y;
            }}
          >
            <View>
              <View className="flex-row items-center justify-between mb-2 ml-1">
                <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                  Interest Rate
                </Text>
                {interestEnabled && errors.interest && (
                  <Text className="text-[10px] text-red-500 font-black uppercase italic mr-1">
                    Invalid Interest!
                  </Text>
                )}
              </View>
              <View
                className={`flex-row items-center bg-white dark:bg-gray-900 rounded-2xl border ${errors.interest ? "border-red-500 bg-red-50/50 dark:bg-red-950/20" : "border-gray-200 dark:border-gray-800"} px-4 shadow-sm`}
              >
                <TextInput
                  ref={interestInputRef}
                  className="flex-1 h-14 text-2xl font-bold text-gray-900 dark:text-gray-100"
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                  value={interestRate}
                  onChangeText={(t) => {
                    handleRateChange(t);
                    setErrors((prev) => ({ ...prev, interest: false }));
                  }}
                  onFocus={(event) =>
                    handleFocus(event.target, interestFocusOffset + 140)
                  }
                  keyboardType="numeric"
                  editable={
                    !isReadOnly &&
                    interestEnabled &&
                    !!name.trim() &&
                    !!amount.trim()
                  }
                />
                <Text className="text-xl font-bold text-gray-400 dark:text-gray-500 ml-2">
                  %
                </Text>
              </View>
            </View>

            <View>
              <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">
                Frequency
              </Text>
              <View className="flex-row gap-2">
                {(["Daily", "Monthly", "Yearly"] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() =>
                      !isReadOnly &&
                      interestEnabled &&
                      !!name.trim() &&
                      !!amount.trim() &&
                      setInterestType(type)
                    }
                    disabled={
                      isReadOnly ||
                      !interestEnabled ||
                      !name.trim() ||
                      !amount.trim()
                    }
                    className={`flex-1 py-3 items-center rounded-xl border ${interestType === type ? "bg-sky-50 border-sky-200 dark:bg-sky-900/40 dark:border-sky-700" : "bg-transparent border-gray-100 dark:border-gray-800 dark:bg-gray-800"}`}
                  >
                    <Text
                      className={`font-bold ${interestType === type ? "text-sky-600 dark:text-sky-400" : "text-gray-400"}`}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScreenContainer>
    </View>
  );
}
