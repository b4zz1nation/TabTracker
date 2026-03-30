import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Animated,
  Keyboard,
  Platform,
  Pressable,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  findNodeHandle,
} from "react-native";
import ScreenContainer from "@/components/screen-container";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useCreditors } from "@/hooks/use-creditors";
import { calculatePayoff } from "@/services/payoff";
import { getReferenceLabel } from "@/services/reference";

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

function formatDueStatus(
  dueDate?: string | null,
  referenceDate?: string | null,
) {
  if (!dueDate) return "No deadline";
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return "No deadline";

  const reference = referenceDate ? new Date(referenceDate) : new Date();
  if (Number.isNaN(reference.getTime())) return "No deadline";

  const refStart = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
  );
  const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.floor(
    (dueStart.getTime() - refStart.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays > 0) return `Due in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
  if (diffDays < 0)
    return `Past due by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"}`;
  return "Due today";
}

const SPRING_CONFIG = {
  damping: 28,
  stiffness: 300,
  useNativeDriver: true as const,
};

const TAB_AVATAR_COLORS = [
  "bg-orange-400",
  "bg-amber-400",
  "bg-yellow-400",
  "bg-rose-400",
  "bg-red-400",
  "bg-orange-500",
];

export default function MyTabModalScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const params = useLocalSearchParams<{
    id?: string;
    readOnly?: string;
    mode?: string;
  }>();
  const {
    creditors,
    addCreditor,
    updateCreditor,
    deleteCreditor,
    getPayments,
  } = useCreditors();
  const isReadOnly = params.readOnly === "true";
  const isAddingToExisting = params.mode === "add_existing" && !!params.id;
  const hasExistingCreditorId = !!params.id;

  const keyboardOffset = Platform.OS === "ios" ? 40 : 20;
  const keyboardFooterGap = 18;
  const interestFocusOffset = Platform.OS === "ios" ? 420 : 380;
  const descriptionFocusOffset = Platform.OS === "ios" ? 320 : 280;
  const isEditing = useMemo(
    () => hasExistingCreditorId && !isAddingToExisting,
    [hasExistingCreditorId, isAddingToExisting],
  );
  const existingCreditor = useMemo(
    () =>
      hasExistingCreditorId
        ? (creditors.find((creditor) => creditor.id === Number(params.id)) ??
          null)
        : null,
    [creditors, hasExistingCreditorId, params.id],
  );

  const [name, setName] = useState(existingCreditor?.name ?? "");
  const [balance, setBalance] = useState(
    existingCreditor ? existingCreditor.balance.toString() : "",
  );
  const [description, setDescription] = useState(
    existingCreditor?.description ?? "",
  );
  const [dueDateInput, setDueDateInput] = useState(
    formatStoredDate(existingCreditor?.due_date),
  );
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [dueDatePickerValue, setDueDatePickerValue] = useState<Date>(
    parseDateInputToDate(formatStoredDate(existingCreditor?.due_date)) ??
      new Date(),
  );
  const [remindersEnabled, setRemindersEnabled] = useState(
    (existingCreditor?.reminders_enabled ?? 1) === 1,
  );
  const [interestEnabled, setInterestEnabled] = useState(
    existingCreditor?.interest_enabled === 1,
  );
  const [interestRate, setInterestRate] = useState(
    existingCreditor && existingCreditor.interest_rate > 0
      ? existingCreditor.interest_rate.toString()
      : "",
  );
  const [overdueInterestRate, setOverdueInterestRate] = useState(
    existingCreditor && (existingCreditor.overdue_interest_rate ?? 0) > 0
      ? existingCreditor.overdue_interest_rate!.toString()
      : "",
  );
  const [interestType, setInterestType] = useState<
    "Daily" | "Monthly" | "Yearly" | null
  >(existingCreditor?.interest_type ?? null);
  const [formError, setFormError] = useState<string | null>(null);
  const [nameFocused, setNameFocused] = useState(false);
  const [amountFocused, setAmountFocused] = useState(false);
  const [dueDateError, setDueDateError] = useState(false);
  const [interestRateError, setInterestRateError] = useState(false);
  const [interestFrequencyError, setInterestFrequencyError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [payments, setPayments] = useState<
    { id: number; amount: number; created_at: string; creditor_id: number }[]
  >([]);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const historyExpandAnim = useRef(new Animated.Value(0)).current;
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
    const principal = parseFloat(balance);
    const baseRate = parseFloat(interestRate);
    const overdueRate = parseFloat(overdueInterestRate);
    if (!interestEnabled || !interestType || !Number.isFinite(principal)) {
      return null;
    }
    if (!Number.isFinite(baseRate) || baseRate <= 0 || principal <= 0) {
      return null;
    }

    return calculatePayoff({
      principal,
      createdAt: existingCreditor?.created_at ?? new Date().toISOString(),
      dueDate: parsedDueDate,
      interestEnabled: true,
      interestRate: baseRate,
      overdueInterestRate:
        Number.isFinite(overdueRate) && overdueRate > 0 ? overdueRate : null,
      interestType,
      completedAt: null,
    });
  }, [
    balance,
    existingCreditor?.created_at,
    interestEnabled,
    interestRate,
    overdueInterestRate,
    interestType,
    parsedDueDate,
  ]);

  const scrollViewRef = useRef<any>(null);
  const interestInputRef = useRef<TextInput>(null);
  const interestSectionY = useRef(0);
  const footerTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!existingCreditor) {
      if (!hasExistingCreditorId) {
        setName("");
        setBalance("");
        setDescription("");
        setDueDateInput("");
        setDueDatePickerValue(new Date());
        setRemindersEnabled(true);
        setInterestEnabled(false);
        setInterestRate("");
        setOverdueInterestRate("");
        setInterestType(null);
      }
      return;
    }

    setName(existingCreditor.name);
    setBalance(isAddingToExisting ? "" : existingCreditor.balance.toString());
    setDescription(
      isAddingToExisting ? "" : (existingCreditor.description ?? ""),
    );
    setDueDateInput(
      isAddingToExisting ? "" : formatStoredDate(existingCreditor.due_date),
    );
    setDueDatePickerValue(
      isAddingToExisting
        ? new Date()
        : (parseDateInputToDate(formatStoredDate(existingCreditor.due_date)) ??
            new Date()),
    );
    setRemindersEnabled(
      isAddingToExisting
        ? true
        : (existingCreditor.reminders_enabled ?? 1) === 1,
    );
    setInterestEnabled(
      isAddingToExisting ? false : existingCreditor.interest_enabled === 1,
    );
    setInterestRate(
      isAddingToExisting
        ? ""
        : existingCreditor.interest_rate > 0
          ? existingCreditor.interest_rate.toString()
          : "",
    );
    setOverdueInterestRate(
      isAddingToExisting
        ? ""
        : (existingCreditor.overdue_interest_rate ?? 0) > 0
          ? existingCreditor.overdue_interest_rate!.toString()
          : "",
    );
    setInterestType(
      isAddingToExisting ? null : (existingCreditor.interest_type ?? null),
    );
  }, [existingCreditor, hasExistingCreditorId, isAddingToExisting]);

  useEffect(() => {
    if (!isReadOnly || !params.id) return;
    getPayments(Number(params.id)).then(setPayments);
  }, [getPayments, isReadOnly, params.id]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      const nextValue = -Math.max(
        0,
        event.endCoordinates.height - keyboardOffset + keyboardFooterGap,
      );
      Animated.spring(footerTranslateY, {
        ...SPRING_CONFIG,
        toValue: nextValue,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      Animated.spring(footerTranslateY, {
        ...SPRING_CONFIG,
        toValue: 0,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [footerTranslateY, keyboardOffset, keyboardFooterGap]);

  const sanitizeBalance = useCallback((text: string) => {
    setBalance(text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"));
  }, []);

  const setDueDateFromPicker = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    setDueDateInput(`${year}-${month}-${day}`);
    setDueDateError(false);
  }, []);

  const openDueDatePicker = useCallback(() => {
    const parsedDate = parseDateInputToDate(dueDateInput);
    setDueDatePickerValue(parsedDate ?? new Date());
    setShowDueDatePicker(true);
  }, [dueDateInput]);

  const applyQuickDueDate = useCallback((daysFromToday: number) => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() + daysFromToday);
    setDueDatePickerValue(base);
    setDueDateInput(formatDateToInput(base));
    setDueDateError(false);
  }, []);

  const clearDueDate = useCallback(() => {
    setDueDateInput("");
    setDueDateError(false);
    setRemindersEnabled(true);
  }, []);

  const handleDueDateTextChange = useCallback((text: string) => {
    setDueDateInput(text.replace(/[^0-9-]/g, "").slice(0, 10));
    setDueDateError(false);
  }, []);

  const onDueDatePickerChange = useCallback(
    (event: any, selectedDate?: Date) => {
      if (Platform.OS === "android") {
        setShowDueDatePicker(false);
      }

      if (event.type !== "set" || !selectedDate) {
        return;
      }

      setDueDatePickerValue(selectedDate);
      setDueDateFromPicker(selectedDate);
    },
    [setDueDateFromPicker],
  );

  const sanitizeRate = useCallback(
    (text: string) => {
      setInterestRate(text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"));
      if (interestRateError) setInterestRateError(false);
    },
    [interestRateError],
  );
  const sanitizeOverdueRate = useCallback(
    (text: string) => {
      setOverdueInterestRate(
        text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"),
      );
      if (interestRateError) setInterestRateError(false);
    },
    [interestRateError],
  );

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
        setInterestRateError(false);
        setInterestFrequencyError(false);
        setInterestType(null);
      }
    },
    [scrollInterestSectionToTop],
  );

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleSave = useCallback(async () => {
    if (isReadOnly) return;
    const trimmedName = name.trim();
    const normalizedBalance = balance.trim();
    const parsedBalance =
      normalizedBalance === "" ? 0 : parseFloat(normalizedBalance);
    const nextBalance = Number.isFinite(parsedBalance) ? parsedBalance : 0;
    const trimmedDescription = description.trim();
    const dueDate = parsedDueDate;

    if (
      !trimmedName ||
      normalizedBalance === "" ||
      !Number.isFinite(parsedBalance)
    ) {
      return;
    }

    if (dueDateInput.trim() && !dueDate) {
      setDueDateError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (interestEnabled) {
      const parsedRate = parseFloat(interestRate);
      if (!interestType) {
        setInterestFrequencyError(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      const parsedOverdueRate = parseFloat(overdueInterestRate);
      const hasBaseRate = Number.isFinite(parsedRate) && parsedRate > 0;
      const hasOverdueRate =
        overdueInterestRate.trim() !== "" &&
        Number.isFinite(parsedOverdueRate) &&
        parsedOverdueRate > 0;
      if (!hasBaseRate && !hasOverdueRate) {
        setInterestRateError(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      if (overdueInterestRate.trim() !== "" && !hasOverdueRate) {
        setInterestRateError(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      if (hasOverdueRate) {
        if (!parsedDueDate) {
          setFormError("Set a due date to configure overdue interest.");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }
        if (hasBaseRate && parsedOverdueRate <= parsedRate) {
          setFormError(
            "Overdue interest rate must be higher than the base interest rate.",
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }
      }
    }

    try {
      setIsSaving(true);
      setFormError(null);

      const nextRate = interestEnabled ? parseFloat(interestRate) : 0;
      const parsedOverdueRate = parseFloat(overdueInterestRate);
      const nextOverdueRate =
        interestEnabled &&
        Number.isFinite(parsedOverdueRate) &&
        parsedOverdueRate > 0
          ? parsedOverdueRate
          : null;
      const nextType = interestEnabled ? interestType : null;
      const nextDescription = trimmedDescription ? trimmedDescription : null;
      if (isAddingToExisting && existingCreditor) {
        await addCreditor(
          existingCreditor.name,
          nextBalance,
          nextDescription ?? existingCreditor.description ?? null,
          interestEnabled,
          nextRate,
          nextType,
          nextOverdueRate,
          dueDate,
          dueDate ? remindersEnabled : false,
          { allowDuplicateName: true },
        );
      } else if (isEditing) {
        await updateCreditor(
          Number(params.id),
          trimmedName,
          nextBalance,
          nextDescription,
          interestEnabled,
          nextRate,
          nextType,
          nextOverdueRate,
          dueDate,
          dueDate ? remindersEnabled : false,
        );
      } else {
        await addCreditor(
          trimmedName,
          nextBalance,
          nextDescription,
          interestEnabled,
          nextRate,
          nextType,
          nextOverdueRate,
          dueDate,
          dueDate ? remindersEnabled : false,
        );
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error: any) {
      if (error.message === "DUPLICATE_NAME") {
        setFormError("A tab with this name already exists.");
      } else {
        Alert.alert("Error", "Failed to save tab");
      }
    } finally {
      setIsSaving(false);
    }
  }, [
    addCreditor,
    balance,
    description,
    dueDateInput,
    parsedDueDate,
    interestEnabled,
    interestRate,
    overdueInterestRate,
    interestType,
    isAddingToExisting,
    isEditing,
    isReadOnly,
    name,
    remindersEnabled,
    existingCreditor,
    params.id,
    router,
    updateCreditor,
  ]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete Tab",
      `Are you sure you want to delete ${name.trim() || "this tab"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteCreditor(Number(params.id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          },
        },
      ],
    );
  }, [deleteCreditor, name, params.id, router]);

  const isFormValid =
    name.trim() !== "" &&
    balance.trim() !== "" &&
    !Number.isNaN(parseFloat(balance));
  const saveDisabled = useMemo(
    () => !isFormValid || isSaving,
    [isFormValid, isSaving],
  );
  const headerTitle = useMemo(
    () =>
      isAddingToExisting
        ? "Add Existing Tab"
        : isEditing
          ? "Edit Tab"
          : "New Tab",
    [isAddingToExisting, isEditing],
  );
  const buttonTitle = useMemo(() => {
    if (isSaving) return "Saving...";
    if (isAddingToExisting) return "Add to Tab";
    return isEditing ? "Update Tab" : "Add Tab";
  }, [isAddingToExisting, isEditing, isSaving]);
  const isNewTab = useMemo(
    () => !isEditing && !isAddingToExisting,
    [isAddingToExisting, isEditing],
  );

  const avatarColor = useMemo(() => {
    const sourceName = name.trim() || existingCreditor?.name || "T";
    const index = sourceName.charCodeAt(0) % TAB_AVATAR_COLORS.length;
    return TAB_AVATAR_COLORS[index];
  }, [existingCreditor?.name, name]);

  const header = (
    <View className="flex-row items-center justify-between px-2 py-3">
      <TouchableOpacity
        onPress={handleBack}
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
        {headerTitle}
      </Text>
      <View className="w-12" />
    </View>
  );

  const footer = (
    <View className="px-6 py-4">
      <Pressable
        className={`h-16 rounded-2xl items-center justify-center shadow-lg shadow-orange-500/30 ${
          saveDisabled
            ? "bg-orange-500/40"
            : "bg-orange-500 active:opacity-90 active:scale-[0.98]"
        }`}
        onPress={handleSave}
        disabled={saveDisabled}
      >
        <Text className="text-white text-lg font-bold">{buttonTitle}</Text>
      </Pressable>
    </View>
  );

  const toggleHistory = useCallback(() => {
    const toValue = isHistoryExpanded ? 0 : 1;
    Animated.spring(historyExpandAnim, {
      toValue,
      tension: 50,
      friction: 8,
      useNativeDriver: false,
    }).start();
    setIsHistoryExpanded(!isHistoryExpanded);
  }, [historyExpandAnim, isHistoryExpanded]);

  if (isReadOnly && existingCreditor) {
    const historyTotal = payments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );
    const displayAmount =
      historyTotal > 0 ? historyTotal : existingCreditor.balance;
    const historyRotation = historyExpandAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "180deg"],
    });
    const historyHeight = historyExpandAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 300],
    });
    const settledDate =
      existingCreditor.completed_at ?? payments[0]?.created_at ?? null;
    const receiptBaseRate =
      existingCreditor.interest_enabled === 1
        ? existingCreditor.interest_rate || 0
        : 0;
    const receiptOverdueRate =
      (existingCreditor.overdue_interest_rate ?? 0) > 0
        ? existingCreditor.overdue_interest_rate
        : null;
    const receiptPrincipalForCalculation = existingCreditor.completed_at
      ? existingCreditor.balance + historyTotal
      : existingCreditor.balance;
    const receiptPayoff = calculatePayoff({
      principal: receiptPrincipalForCalculation,
      createdAt: existingCreditor.created_at,
      dueDate: existingCreditor.due_date,
      interestEnabled: existingCreditor.interest_enabled === 1,
      interestRate: existingCreditor.interest_rate || 0,
      overdueInterestRate: existingCreditor.overdue_interest_rate ?? null,
      interestType: existingCreditor.interest_type,
      completedAt: settledDate,
    });
    const receiptAccruedInterest = receiptPayoff.accruedInterest;

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
                REF:{" "}
                {getReferenceLabel(
                  "tab",
                  existingCreditor.id,
                  existingCreditor.reference_code,
                )}
              </Text>
            </View>

            <View className="border-t border-b border-dashed border-gray-200 dark:border-zinc-800 py-6 my-1 gap-4">
              <View className="flex-row justify-between">
                <Text className="text-gray-400 dark:text-gray-500 font-medium text-sm">
                  Tab Name
                </Text>
                <Text className="text-gray-900 dark:text-gray-100 font-bold text-base">
                  {existingCreditor.name}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-400 dark:text-gray-500 font-medium text-sm">
                  Principal Paid
                </Text>
                <Text className="text-gray-900 dark:text-gray-100 font-bold text-base">
                  PHP {displayAmount.toFixed(2)}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-400 dark:text-gray-500 font-medium text-sm">
                  Base Rate
                </Text>
                <Text className="text-gray-900 dark:text-gray-100 font-bold text-sm">
                  {existingCreditor.interest_enabled
                    ? `${receiptBaseRate}% / ${existingCreditor.interest_type ?? "Monthly"}`
                    : "0%"}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-400 dark:text-gray-500 font-medium text-sm">
                  After Due Rate
                </Text>
                <Text className="text-gray-900 dark:text-gray-100 font-bold text-sm">
                  {existingCreditor.interest_enabled
                    ? receiptOverdueRate !== null
                      ? `${receiptOverdueRate}%`
                      : "Same as base"
                    : "N/A"}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-400 dark:text-gray-500 font-medium text-sm">
                  Due Date
                </Text>
                <Text className="text-gray-900 dark:text-gray-100 font-bold text-sm">
                  {existingCreditor.due_date
                    ? new Date(existingCreditor.due_date).toLocaleDateString()
                    : "Not set"}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-400 dark:text-gray-500 font-medium text-sm">
                  Due Status
                </Text>
                <Text className="text-gray-900 dark:text-gray-100 font-bold text-sm">
                  {formatDueStatus(existingCreditor.due_date, settledDate)}
                </Text>
              </View>
              {receiptAccruedInterest > 0 && (
                <View className="flex-row justify-between">
                  <Text className="text-gray-400 dark:text-gray-500 font-medium text-sm">
                    Accumulated
                  </Text>
                  <Text className="text-emerald-500 font-bold text-base">
                    + PHP {receiptAccruedInterest.toFixed(2)}
                  </Text>
                </View>
              )}
            </View>

            {!!existingCreditor.description && (
              <View className="mt-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                <Text className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest mb-1.5 ml-1">
                  Description
                </Text>
                <Text className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic">
                  {`"${existingCreditor.description}"`}
                </Text>
              </View>
            )}

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
                    {payments.map((payment) => (
                      <View
                        key={payment.id}
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
                              PHP {payment.amount.toFixed(2)}
                            </Text>
                            <Text className="text-[8px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-tighter">
                              {new Date(payment.created_at).toLocaleString()}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-[8px] text-sky-500 font-black uppercase tracking-widest">
                          Paid
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
                    {new Date(existingCreditor.created_at).toLocaleString()}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={12} color="#d1d5db" />
                <View className="items-end">
                  <Text className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest mb-1">
                    Settled Date
                  </Text>
                  <Text className="text-gray-700 dark:text-gray-300 font-bold text-[10px]">
                    {settledDate
                      ? new Date(settledDate).toLocaleString()
                      : "N/A"}
                  </Text>
                </View>
              </View>
            </View>

            <View className="border-t-2 border-gray-100 dark:border-zinc-800 pt-6 mt-1 items-center">
              <Text className="text-gray-400 dark:text-gray-500 uppercase text-[10px] font-black tracking-[3px] mb-1">
                Total Settled
              </Text>
              <Text className="text-4xl font-black text-gray-900 dark:text-gray-100">
                PHP {historyTotal.toFixed(2)}
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
        footerContainerStyle={{ transform: [{ translateY: footerTranslateY }] }}
        edges={["top", "bottom"]}
        extraHeight={260}
        contentContainerStyle={{ padding: 24 }}
      >
        {formError && (
          <View className="mb-6 rounded-2xl bg-rose-500/10 border border-rose-200 p-4">
            <Text className="text-rose-600 font-semibold">{formError}</Text>
          </View>
        )}

        {!isNewTab && (
          <View className="flex-row items-center mb-10 px-1">
            <View
              className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${avatarColor}`}
            >
              <Text className="text-white font-bold text-base">
                {(name.trim() || existingCreditor?.name || "T")
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>
            <View>
              <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {name.trim() || existingCreditor?.name || "New Tab"}
              </Text>
            </View>
          </View>
        )}

        {isNewTab ? (
          <View className="mb-8 flex-row items-start gap-3">
            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">
                Tab Name
              </Text>
              <View
                className={`bg-white dark:bg-gray-900 rounded-2xl border ${
                  nameFocused
                    ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
                    : "border-gray-200 dark:border-gray-800"
                } px-4 shadow-sm`}
              >
                <TextInput
                  className="h-16 text-lg font-bold text-gray-900 dark:text-gray-100"
                  placeholder="Tab name"
                  placeholderTextColor="#9ca3af"
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    if (formError) setFormError(null);
                  }}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                  autoFocus={true}
                  editable={true}
                />
              </View>
            </View>

            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">
                Amount Owed
              </Text>
              <View
                className={`bg-white dark:bg-gray-900 rounded-2xl border ${
                  amountFocused
                    ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
                    : "border-gray-200 dark:border-gray-800"
                } px-4 shadow-sm`}
              >
                <TextInput
                  className="h-16 text-lg font-bold text-gray-900 dark:text-gray-100"
                  placeholder="0.00"
                  placeholderTextColor="#9ca3af"
                  value={balance}
                  onChangeText={sanitizeBalance}
                  onFocus={(event) => {
                    setAmountFocused(true);
                    handleFocus(event.target);
                  }}
                  onBlur={() => setAmountFocused(false)}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        ) : (
          <>
            {!isAddingToExisting && (
              <View className="mb-8">
                <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">
                  Tab Name
                </Text>
                <View
                  className={`flex-row items-center bg-white dark:bg-gray-900 rounded-2xl border ${
                    nameFocused
                      ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
                      : "border-gray-200 dark:border-gray-800"
                  } px-4 shadow-sm`}
                >
                  <TextInput
                    className="flex-1 h-16 text-xl font-bold text-gray-900 dark:text-gray-100"
                    placeholder="Tab name"
                    placeholderTextColor="#9ca3af"
                    value={name}
                    onChangeText={(text) => {
                      setName(text);
                      if (formError) setFormError(null);
                    }}
                    onFocus={() => setNameFocused(true)}
                    onBlur={() => setNameFocused(false)}
                    autoFocus={!isEditing}
                    editable={true}
                  />
                </View>
              </View>
            )}

            <View className="mb-8">
              <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">
                Amount Owed
              </Text>
              <View
                className={`flex-row items-center bg-white dark:bg-gray-900 rounded-2xl border ${
                  amountFocused
                    ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
                    : "border-gray-200 dark:border-gray-800"
                } px-4 shadow-sm`}
              >
                <Text className="text-2xl font-bold text-gray-400 dark:text-gray-500 mr-2">
                  PHP
                </Text>
                <TextInput
                  className="flex-1 h-16 text-3xl font-bold text-gray-900 dark:text-gray-100"
                  placeholder="0.00"
                  placeholderTextColor="#9ca3af"
                  value={balance}
                  onChangeText={sanitizeBalance}
                  onFocus={(event) => {
                    setAmountFocused(true);
                    handleFocus(event.target);
                  }}
                  onBlur={() => setAmountFocused(false)}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </>
        )}

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
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-base font-bold text-gray-900 dark:text-gray-100">
                Due reminders
              </Text>
              <Text className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {parsedDueDate
                  ? "3 days before, 1 day before, due day, and overdue reminders"
                  : "Add a due date first"}
              </Text>
            </View>
            <Switch
              value={remindersEnabled && !!parsedDueDate}
              onValueChange={setRemindersEnabled}
              trackColor={{ false: "#e5e7eb", true: "#fed7aa" }}
              thumbColor={
                remindersEnabled && !!parsedDueDate ? "#f97316" : "#f3f4f6"
              }
              disabled={!parsedDueDate}
            />
          </View>
        </View>
        <View className="mb-8 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-4 py-3 shadow-sm">
          <View className="flex-row flex-wrap gap-2">
            <Pressable
              className="px-3 py-2 rounded-xl bg-orange-50 dark:bg-orange-900/30"
              onPress={() => applyQuickDueDate(0)}
            >
              <Text className="text-xs font-bold text-orange-600 dark:text-orange-400">
                Today
              </Text>
            </Pressable>
            <Pressable
              className="px-3 py-2 rounded-xl bg-orange-50 dark:bg-orange-900/30"
              onPress={() => applyQuickDueDate(7)}
            >
              <Text className="text-xs font-bold text-orange-600 dark:text-orange-400">
                +7 days
              </Text>
            </Pressable>
            <Pressable
              className="px-3 py-2 rounded-xl bg-orange-50 dark:bg-orange-900/30"
              onPress={() => applyQuickDueDate(30)}
            >
              <Text className="text-xs font-bold text-orange-600 dark:text-orange-400">
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

        <View className="mb-0 p-5 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-md">
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center">
              <View
                className={`w-10 h-10 rounded-full ${
                  !balance.trim()
                    ? "bg-gray-100 dark:bg-zinc-800"
                    : "bg-orange-100 dark:bg-orange-900/40"
                } items-center justify-center mr-3`}
              >
                <Ionicons
                  name="trending-up"
                  size={20}
                  color={!balance.trim() ? "#9ca3af" : "#f97316"}
                />
              </View>
              <Text
                className={`text-base font-bold ${
                  !balance.trim()
                    ? "text-gray-300 dark:text-gray-600"
                    : "text-gray-900 dark:text-gray-100"
                }`}
              >
                Interest Rate
              </Text>
            </View>
            <Switch
              value={interestEnabled}
              onValueChange={handleToggleInterest}
              trackColor={{ false: "#e5e7eb", true: "#fed7aa" }}
              thumbColor={interestEnabled ? "#f97316" : "#f3f4f6"}
              disabled={!balance.trim()}
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
                  className={`flex-row items-center bg-white dark:bg-gray-900 rounded-2xl border ${
                    interestRateError
                      ? "border-red-500 bg-red-50/50 dark:bg-red-950/20"
                      : "border-gray-200 dark:border-gray-800"
                  } px-4 shadow-sm`}
                >
                  <TextInput
                    ref={interestInputRef}
                    className="flex-1 h-14 text-2xl font-bold text-gray-900 dark:text-gray-100"
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    value={interestRate}
                    onChangeText={sanitizeRate}
                    onFocus={(event) =>
                      handleFocus(event.target, interestFocusOffset)
                    }
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
                      className={`flex-1 py-3 items-center rounded-xl border ${
                        interestType === type
                          ? "bg-orange-50 border-orange-200 dark:bg-orange-900/40 dark:border-orange-700"
                          : interestFrequencyError
                            ? "border-red-500 bg-red-50/50 dark:bg-red-950/20"
                            : "bg-transparent border-gray-100 dark:border-gray-800 dark:bg-gray-800"
                      }`}
                    >
                      <Text
                        className={`font-bold ${
                          interestType === type
                            ? "text-orange-500"
                            : "text-gray-400"
                        }`}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {canConfigureOverdueInterest && (
                <View>
                  <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">
                    Overdue Interest Rate
                  </Text>
                  <View
                    className={`flex-row items-center bg-white dark:bg-gray-900 rounded-2xl border ${
                      interestRateError
                        ? "border-red-500 bg-red-50/50 dark:bg-red-950/20"
                        : "border-gray-200 dark:border-gray-800"
                    } px-4 shadow-sm`}
                  >
                    <TextInput
                      className="flex-1 h-14 text-2xl font-bold text-gray-900 dark:text-gray-100"
                      placeholder="Optional"
                      placeholderTextColor="#9ca3af"
                      value={overdueInterestRate}
                      onChangeText={sanitizeOverdueRate}
                      onFocus={(event) =>
                        handleFocus(event.target, interestFocusOffset + 160)
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

        {isEditing && !isReadOnly && (
          <Pressable
            className="flex-row items-center justify-center mt-6 gap-2 active:opacity-60"
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={20} color="#f43f5e" />
            <Text className="text-rose-500 font-semibold text-base">
              Delete Tab
            </Text>
          </Pressable>
        )}
      </ScreenContainer>
    </View>
  );
}
