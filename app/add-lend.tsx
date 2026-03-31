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
import { calculatePayoff } from "@/services/payoff";
import { createUniqueReferenceForKind } from "@/services/reference";

const NativeDateTimePicker = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("@react-native-community/datetimepicker")
      .default as React.ComponentType<any>;
  } catch {
    return null;
  }
})();

function formatStoredDate(dateString?: string | null) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInputToIso(dateInput: string) {
  if (!dateInput.trim()) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) return null;

  const [yearText, monthText, dayText] = dateInput.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsed = new Date(year, month - 1, day, 9, 0, 0, 0);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed.toISOString();
}

function parseDateInputToDate(dateInput: string) {
  if (!dateInput.trim()) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) return null;

  const [yearText, monthText, dayText] = dateInput.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function formatDateToInput(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPastDueDays(dateInput: string) {
  const parsed = parseDateInputToDate(dateInput);
  if (!parsed) return 0;

  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const dueStart = new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
  );
  const diff = todayStart.getTime() - dueStart.getTime();
  if (diff <= 0) return 0;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function AddLendScreen() {
  const router = useRouter();
  const { customer_id, customer_name, lend_id } = useLocalSearchParams<{
    customer_id: string;
    customer_name: string;
    lend_id?: string;
  }>();
  const isEditing = !!lend_id;
  const colorScheme = useColorScheme();

  const db = useSQLiteContext();
  const { refresh: refreshCustomers } = useCustomers();
  const { refresh: refreshLends, lends } = useLends();
  const existingLend = useMemo(
    () => lends.find((lend) => lend.id === Number(lend_id)) ?? null,
    [lend_id, lends],
  );

  const [amount, setAmount] = useState("");
  const [interestEnabled, setInterestEnabled] = useState(false);
  const [interestRate, setInterestRate] = useState("");
  const [overdueInterestRate, setOverdueInterestRate] = useState("");
  const [interestType, setInterestType] = useState<
    "Daily" | "Monthly" | "Yearly" | null
  >(null);
  const [description, setDescription] = useState("");
  const [dueDateInput, setDueDateInput] = useState("");
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [dueDatePickerValue, setDueDatePickerValue] = useState<Date>(
    new Date(),
  );
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const scrollViewRef = useRef<any>(null);
  const interestInputRef = useRef<TextInput>(null);
  const interestSectionY = useRef(0);
  const footerTranslateY = useRef(new Animated.Value(0)).current;
  const keyboardVerticalOffset = Platform.OS === "ios" ? 40 : 20;
  const keyboardFooterGap = 18;

  const [errorVisible, setErrorVisible] = useState(false);
  const [dueDateError, setDueDateError] = useState(false);
  const [interestRateError, setInterestRateError] = useState(false);
  const [overdueInterestRateError, setOverdueInterestRateError] =
    useState(false);
  const [interestFrequencyError, setInterestFrequencyError] = useState(false);
  const parsedDueDate = useMemo(
    () => parseDateInputToIso(dueDateInput),
    [dueDateInput],
  );
  const pastDueDays = useMemo(
    () => getPastDueDays(dueDateInput),
    [dueDateInput],
  );
  const canConfigureOverdueInterest = useMemo(
    () => !!parsedDueDate,
    [parsedDueDate],
  );
  const interestPreview = useMemo(() => {
    const principal = parseFloat(amount);
    const baseRate = parseFloat(interestRate);
    const overdueRate = parseFloat(overdueInterestRate);
    if (!interestEnabled || !interestType || !Number.isFinite(principal)) {
      return null;
    }
    if (!Number.isFinite(baseRate) || baseRate <= 0 || principal <= 0) {
      return null;
    }

    const payoff = calculatePayoff({
      principal,
      createdAt: existingLend?.created_at ?? new Date().toISOString(),
      dueDate: parsedDueDate,
      interestEnabled: true,
      interestRate: baseRate,
      overdueInterestRate:
        Number.isFinite(overdueRate) && overdueRate > 0 ? overdueRate : null,
      interestType,
      completedAt: null,
    });
    return payoff;
  }, [
    amount,
    existingLend?.created_at,
    interestEnabled,
    interestRate,
    overdueInterestRate,
    interestType,
    parsedDueDate,
  ]);

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

  const handleInterestFieldFocus = useCallback(
    (reactNode: any, extraHeight?: number) => {
      scrollInterestSectionToTop();
      setTimeout(() => {
        handleFocus(reactNode, extraHeight);
      }, 60);
    },
    [handleFocus, scrollInterestSectionToTop],
  );

  const handleOverdueInterestFocus = useCallback(
    (reactNode: any, extraHeight?: number) => {
      handleInterestFieldFocus(reactNode, extraHeight);
    },
    [handleInterestFieldFocus],
  );

  const handleToggleInterest = useCallback(
    (val: boolean) => {
      setInterestEnabled(val);
      if (val) {
        setTimeout(() => {
          scrollInterestSectionToTop();
          interestInputRef.current?.focus();
        }, 100);
      } else {
        setInterestRate("");
        setOverdueInterestRate("");
        setInterestType(null);
        setInterestRateError(false);
        setOverdueInterestRateError(false);
        setInterestFrequencyError(false);
      }
    },
    [scrollInterestSectionToTop],
  );

  const handleAmountChange = (text: string) => {
    setAmount(text.replace(/[^0-9.]/g, "").replace(/(\..*)\./, "$1"));
    setErrorVisible(false);
  };

  const handleDueDateChange = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    setDueDateInput(`${year}-${month}-${day}`);
    setDueDateError(false);
  };

  const handleDueDateTextChange = (text: string) => {
    setDueDateInput(text.replace(/[^0-9-]/g, "").slice(0, 10));
    setDueDateError(false);
  };

  const openDueDatePicker = () => {
    const parsedDate = parseDateInputToDate(dueDateInput);
    setDueDatePickerValue(parsedDate ?? new Date());
    setShowDueDatePicker(true);
  };

  const applyQuickDueDate = (daysFromToday: number) => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() + daysFromToday);
    setDueDatePickerValue(base);
    setDueDateInput(formatDateToInput(base));
    setDueDateError(false);
  };

  const clearDueDate = () => {
    setDueDateInput("");
    setDueDateError(false);
    setRemindersEnabled(true);
  };

  const onDueDatePickerChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDueDatePicker(false);
    }

    if (event.type !== "set" || !selectedDate) {
      return;
    }

    setDueDatePickerValue(selectedDate);
    handleDueDateChange(selectedDate);
  };

  const handleRateChange = (text: string) => {
    setInterestRate(text.replace(/[^0-9.]/g, "").replace(/(\..*)\./, "$1"));
    setInterestRateError(false);
  };
  const handleOverdueRateChange = (text: string) => {
    setOverdueInterestRate(
      text.replace(/[^0-9.]/g, "").replace(/(\..*)\./, "$1"),
    );
    setOverdueInterestRateError(false);
  };

  useEffect(() => {
    if (lend_id) {
      const lend = lends.find((l) => l.id === Number(lend_id));
      if (lend) {
        setAmount(lend.amount.toString());
        setInterestEnabled(lend.interest_enabled === 1);
        setInterestRate(lend.interest_rate?.toString() || "");
        setOverdueInterestRate(lend.overdue_interest_rate?.toString() || "");
        setInterestType(lend.interest_type || null);
        setDescription(lend.description || "");
        setDueDateInput(formatStoredDate(lend.due_date));
        const parsedDate = parseDateInputToDate(
          formatStoredDate(lend.due_date),
        );
        setDueDatePickerValue(parsedDate ?? new Date());
        setRemindersEnabled((lend.reminders_enabled ?? 1) === 1);
      }
    }
  }, [lend_id, lends]);

  useEffect(() => {
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
  }, [footerTranslateY, keyboardVerticalOffset, keyboardFooterGap]);

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    const dueDate = parsedDueDate;
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorVisible(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (dueDateInput.trim() && !dueDate) {
      setDueDateError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (interestEnabled) {
      const numRate = parseFloat(interestRate);
      if (!interestType) {
        setInterestFrequencyError(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      const numOverdueRate = parseFloat(overdueInterestRate);
      const hasBaseRate = Number.isFinite(numRate) && numRate > 0;
      const hasOverdueRate =
        overdueInterestRate.trim() !== "" &&
        Number.isFinite(numOverdueRate) &&
        numOverdueRate > 0;
      if (!hasBaseRate && !hasOverdueRate) {
        setInterestRateError(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      if (overdueInterestRate.trim() !== "" && !hasOverdueRate) {
        setOverdueInterestRateError(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      if (hasOverdueRate) {
        if (!parsedDueDate) {
          setOverdueInterestRateError(true);
          Alert.alert(
            "Overdue Interest Locked",
            "Set a due date to configure overdue interest.",
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }
        if (hasBaseRate && numOverdueRate <= numRate) {
          setOverdueInterestRateError(true);
          Alert.alert(
            "Invalid Overdue Rate",
            "Overdue interest rate must be higher than the base interest rate.",
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }
      }
    }

    try {
      setIsSaving(true);
      const parsedBaseRate = parseFloat(interestRate);
      const parsedOverdueRate = parseFloat(overdueInterestRate);
      const normalizedOverdueRate =
        interestEnabled &&
        Number.isFinite(parsedOverdueRate) &&
        parsedOverdueRate > 0
          ? parsedOverdueRate
          : null;

      if (isEditing) {
        await db.runAsync(
          "UPDATE lends SET amount = ?, interest_enabled = ?, interest_rate = ?, overdue_interest_rate = ?, interest_type = ?, description = ?, due_date = ?, reminders_enabled = ? WHERE id = ?",
          [
            numAmount,
            interestEnabled ? 1 : 0,
            interestEnabled &&
            Number.isFinite(parsedBaseRate) &&
            parsedBaseRate > 0
              ? parsedBaseRate
              : 0,
            normalizedOverdueRate,
            interestType,
            description || null,
            dueDate,
            dueDate ? (remindersEnabled ? 1 : 0) : 0,
            Number(lend_id),
          ],
        );
      } else {
        const referenceCode = await createUniqueReferenceForKind(db, "lend");
        await db.runAsync(
          "INSERT INTO lends (reference_code, customer_id, amount, status, interest_enabled, interest_rate, overdue_interest_rate, interest_type, description, due_date, reminders_enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            referenceCode,
            Number(customer_id),
            numAmount,
            "Ongoing",
            interestEnabled ? 1 : 0,
            interestEnabled &&
            Number.isFinite(parsedBaseRate) &&
            parsedBaseRate > 0
              ? parsedBaseRate
              : 0,
            normalizedOverdueRate,
            interestType,
            description || null,
            dueDate,
            dueDate ? (remindersEnabled ? 1 : 0) : 0,
            new Date().toISOString(),
          ],
        );
      }

      const allLends = await db.getAllAsync<{ amount: number }>(
        "SELECT amount FROM lends WHERE customer_id = ? AND status = ?",
        [Number(customer_id), "Ongoing"],
      );
      const newBalance = allLends.reduce((sum, l) => sum + l.amount, 0);
      await db.runAsync("UPDATE customers SET balance = ? WHERE id = ?", [
        newBalance,
        Number(customer_id),
      ]);

      await refreshCustomers();
      await refreshLends();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to save lend. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const header = (
    <View className="flex-row items-center justify-between px-2 py-3">
      <TouchableOpacity
        onPress={() => router.back()}
        activeOpacity={0.6}
        className="w-12 h-12 items-center justify-center"
      >
        <Ionicons
          name="chevron-back"
          size={28}
          color={colorScheme === "dark" ? "#ffffff" : "#1f2937"}
        />
      </TouchableOpacity>
      <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
        {isEditing ? "Edit Lend" : "New Lend"}
      </Text>
      <View className="w-12" />
    </View>
  );

  const isFormValid = amount.trim() !== "" && !isNaN(parseFloat(amount));

  const footer = (
    <View className="px-6 py-4">
      <Pressable
        className={`h-16 rounded-2xl items-center justify-center shadow-lg ${!isFormValid ? "bg-gray-100 dark:bg-gray-800" : isSaving ? "bg-sky-400" : "bg-sky-500 shadow-sky-500/30 active:opacity-90 active:scale-[0.98]"}`}
        onPress={handleSave}
        disabled={isSaving || !isFormValid}
      >
        <Text
          className={`text-lg font-bold ${!isFormValid ? "text-gray-400 dark:text-gray-600" : "text-white"}`}
        >
          {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Confirm Lend"}
        </Text>
      </Pressable>
    </View>
  );

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

  return (
    <View className="flex-1">
      <ScreenContainer
        scrollViewRef={scrollViewRef}
        header={header}
        footer={footer}
        footerContainerStyle={{ transform: [{ translateY: footerTranslateY }] }}
        edges={["top", "bottom"]}
        contentContainerStyle={{ padding: 24 }}
      >
        <View className="flex-row items-center mb-10 px-1">
          <View
            className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${getAvatarColor(customer_name || "C")}`}
          >
            <Text className="text-white font-bold text-base">
              {(customer_name || "C").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest font-semibold">
              Lending to
            </Text>
            <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {customer_name}
            </Text>
          </View>
        </View>

        <View className="mb-8">
          <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">
            Lend Amount
          </Text>
          <View
            className={`flex-row items-center bg-white dark:bg-gray-900 rounded-2xl border ${errorVisible ? "border-red-500 bg-red-50/50 dark:bg-red-950/20" : "border-gray-200 dark:border-gray-800"} px-4 shadow-sm`}
          >
            <Text className="text-2xl font-bold text-gray-400 dark:text-gray-500 mr-2">
              ₱
            </Text>
            <TextInput
              className="flex-1 h-16 text-3xl font-bold text-gray-900 dark:text-gray-100"
              placeholder="0.00"
              placeholderTextColor="#9ca3af"
              value={amount}
              onChangeText={handleAmountChange}
              onFocus={(event) => handleFocus(event.target)}
              keyboardType="numeric"
              autoFocus={!isEditing}
            />
          </View>
        </View>

        <View className="mb-8">
          <View className="flex-row items-center justify-between mb-2 ml-1">
            <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              Due Date (Optional)
            </Text>
            {dueDateError && (
              <Text className="text-[10px] text-red-500 font-semibold mr-1">
                Use YYYY-MM-DD
              </Text>
            )}
          </View>
          {NativeDateTimePicker ? (
            <>
              <Pressable
                onPress={openDueDatePicker}
                className={`h-16 bg-white dark:bg-gray-900 rounded-2xl border ${
                  dueDateError
                    ? "border-red-500 bg-red-50/50 dark:bg-red-950/20"
                    : "border-gray-200 dark:border-gray-800"
                } px-4 shadow-sm flex-row items-center justify-between`}
              >
                <Text
                  className={`text-lg font-bold ${
                    dueDateInput
                      ? "text-gray-900 dark:text-gray-100"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {dueDateInput || "YYYY-MM-DD"}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#9ca3af" />
              </Pressable>
              {showDueDatePicker && (
                <View className="mt-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 px-2 py-2 shadow-sm">
                  <NativeDateTimePicker
                    value={dueDatePickerValue}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={onDueDatePickerChange}
                  />
                  {Platform.OS === "ios" && (
                    <View className="flex-row justify-end gap-3 px-2 pb-2">
                      <Pressable onPress={() => setShowDueDatePicker(false)}>
                        <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                          Done
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              )}
            </>
          ) : (
            <View className="mt-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 px-2 py-2 shadow-sm">
              <TextInput
                className="h-14 text-lg font-bold text-gray-900 dark:text-gray-100 px-3"
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
                value={dueDateInput}
                onChangeText={handleDueDateTextChange}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          )}
        </View>

        <View className="mb-8 p-5 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-md">
          <View className="flex-row items-start gap-3">
            <View className="flex-1 pr-2">
              <Text className="text-base font-bold text-gray-900 dark:text-gray-100">
                Due reminders
              </Text>
              <Text className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {parsedDueDate
                  ? "3 days before, 1 day before, due day, and overdue reminders"
                  : "Add a due date first"}
              </Text>
            </View>
            <View className="pt-0.5">
              <Switch
                value={remindersEnabled && !!parsedDueDate}
                onValueChange={setRemindersEnabled}
                trackColor={{ false: "#e5e7eb", true: "#bae6fd" }}
                thumbColor={
                  remindersEnabled && !!parsedDueDate ? "#0ea5e9" : "#f3f4f6"
                }
                disabled={!parsedDueDate}
              />
            </View>
          </View>
        </View>
        <View className="mb-8 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-4 py-3 shadow-sm">
          <View className="flex-row flex-wrap gap-2">
            <Pressable
              className="px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-900/30"
              onPress={() => applyQuickDueDate(0)}
            >
              <Text className="text-xs font-bold text-sky-600 dark:text-sky-400">
                Today
              </Text>
            </Pressable>
            <Pressable
              className="px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-900/30"
              onPress={() => applyQuickDueDate(7)}
            >
              <Text className="text-xs font-bold text-sky-600 dark:text-sky-400">
                +7 days
              </Text>
            </Pressable>
            <Pressable
              className="px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-900/30"
              onPress={() => applyQuickDueDate(30)}
            >
              <Text className="text-xs font-bold text-sky-600 dark:text-sky-400">
                +30 days
              </Text>
            </Pressable>
            <Pressable
              className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800"
              onPress={clearDueDate}
            >
              <Text className="text-xs font-bold text-gray-500 dark:text-gray-400">
                Clear
              </Text>
            </Pressable>
          </View>
          {pastDueDays > 0 && (
            <Text className="mt-3 text-xs font-semibold text-amber-600 dark:text-amber-400">
              Past due by {pastDueDays} day{pastDueDays === 1 ? "" : "s"}.
            </Text>
          )}
          {interestPreview && (
            <Text className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Accrued interest now: PHP{" "}
              {interestPreview.accruedInterest.toFixed(2)}
            </Text>
          )}
        </View>

        <View className="mb-8">
          <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">
            Description (Optional)
          </Text>
          <View className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 px-4 py-3 shadow-sm min-h-[80px]">
            <TextInput
              className="text-lg text-gray-900 dark:text-gray-100 min-h-[60px]"
              placeholder="What's this for?"
              placeholderTextColor="#9ca3af"
              value={description}
              onChangeText={setDescription}
              onFocus={(event) => handleFocus(event.target)}
              multiline={true}
              textAlignVertical="top"
              maxLength={100}
            />
            <Text className="text-[10px] text-gray-400 dark:text-gray-500 text-right mt-1">
              {description.length}/100
            </Text>
          </View>
        </View>

        <View
          className="mb-0 p-5 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-md"
          onLayout={(event) => {
            interestSectionY.current = event.nativeEvent.layout.y;
          }}
        >
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center">
              <View
                className={`w-10 h-10 rounded-full ${!amount.trim() ? "bg-gray-100 dark:bg-zinc-800" : "bg-sky-100 dark:bg-sky-900/40"} items-center justify-center mr-3`}
              >
                <Ionicons
                  name="trending-up"
                  size={20}
                  color={!amount.trim() ? "#9ca3af" : "#0ea5e9"}
                />
              </View>
              <Text
                className={`text-base font-bold ${!amount.trim() ? "text-gray-300 dark:text-gray-600" : "text-gray-900 dark:text-gray-100"}`}
              >
                Interest Rate
              </Text>
            </View>
            <Switch
              value={interestEnabled}
              onValueChange={handleToggleInterest}
              trackColor={{ false: "#e5e7eb", true: "#bae6fd" }}
              thumbColor={interestEnabled ? "#0ea5e9" : "#f3f4f6"}
              disabled={!amount.trim()}
            />
          </View>
          {interestEnabled && (
            <View className="gap-6">
              <View>
                <View className="flex-row items-center justify-between mb-2 ml-1">
                  <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                    Interest Rate
                  </Text>
                  {interestRateError && (
                    <Text className="text-[10px] text-red-500 font-semibold mr-1">
                      Invalid interest rate
                    </Text>
                  )}
                </View>
                <View
                  className={`flex-row items-center bg-white dark:bg-gray-900 rounded-2xl border ${interestRateError ? "border-red-500 bg-red-50/50 dark:bg-red-950/20" : "border-gray-200 dark:border-gray-800"} px-4 shadow-sm`}
                >
                  <TextInput
                    ref={interestInputRef}
                    className="flex-1 h-14 text-2xl font-bold text-gray-900 dark:text-gray-100"
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    value={interestRate}
                    onChangeText={(t) => {
                      handleRateChange(t);
                    }}
                    onFocus={(event) => handleFocus(event.target, 220)}
                    keyboardType="numeric"
                    editable={interestEnabled}
                  />
                  <Text className="text-xl font-bold text-gray-400 dark:text-gray-500 ml-2">
                    %
                  </Text>
                </View>
              </View>

              <View>
                <View className="flex-row items-center justify-between mb-2 ml-1">
                  <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                    Frequency
                  </Text>
                  {interestFrequencyError && (
                    <Text className="text-[10px] text-red-500 font-semibold mr-1">
                      Select a frequency
                    </Text>
                  )}
                </View>
                <View className="flex-row gap-2">
                  {(["Daily", "Monthly", "Yearly"] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => {
                        setInterestType(type);
                        setInterestFrequencyError(false);
                      }}
                      disabled={false}
                      className={`flex-1 py-3 items-center rounded-xl border ${interestType === type ? "bg-sky-50 border-sky-200 dark:bg-sky-900/40 dark:border-sky-700" : interestFrequencyError ? "border-red-500 bg-red-50/50 dark:bg-red-950/20" : "bg-transparent border-gray-100 dark:border-gray-800 dark:bg-gray-800"}`}
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
              {canConfigureOverdueInterest && (
                <View>
                  <View className="flex-row items-center justify-between mb-2 ml-1">
                    <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                      Overdue Interest Rate
                    </Text>
                    {overdueInterestRateError && (
                      <Text className="text-[10px] text-red-500 font-semibold mr-1">
                        Must be greater than base rate
                      </Text>
                    )}
                  </View>
                  <View
                    className={`flex-row items-center bg-white dark:bg-gray-900 rounded-2xl border ${overdueInterestRateError ? "border-red-500 bg-red-50/50 dark:bg-red-950/20" : "border-gray-200 dark:border-gray-800"} px-4 shadow-sm`}
                  >
                    <TextInput
                      className="flex-1 h-14 text-2xl font-bold text-gray-900 dark:text-gray-100"
                      placeholder="Optional"
                      placeholderTextColor="#9ca3af"
                      value={overdueInterestRate}
                      onChangeText={handleOverdueRateChange}
                      onFocus={(event) =>
                        handleOverdueInterestFocus(event.target, 320)
                      }
                      keyboardType="numeric"
                    />
                    <Text className="text-xl font-bold text-gray-400 dark:text-gray-500 ml-2">
                      %
                    </Text>
                  </View>
                  <Text className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
                    Applies only after due date. Leave blank to keep same rate.
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScreenContainer>
    </View>
  );
}
