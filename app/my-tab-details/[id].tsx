import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import ScreenContainer from "@/components/screen-container";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useCreditors } from "@/hooks/use-creditors";
import { calculatePayoff } from "@/services/payoff";
import { getReferenceLabel } from "@/services/reference";

function formatDateLabel(dateString?: string | null) {
  if (!dateString) return "Not set";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString();
}

function getDueStatusLabel(
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

export default function MyTabDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { creditors, getPayments } = useCreditors();
  const [payments, setPayments] = useState<
    { id: number; amount: number; created_at: string; creditor_id: number }[]
  >([]);

  const creditorId = Number(id);
  const creditor = creditors.find((item) => item.id === creditorId);

  useEffect(() => {
    let isMounted = true;

    if (creditorId) {
      getPayments(creditorId).then((result) => {
        if (isMounted) {
          setPayments(result);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [creditorId, getPayments]);

  const stats = useMemo(() => {
    if (!creditor) return null;
    const totalPaid = payments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );
    const principalForCalculation = creditor.completed_at
      ? creditor.balance + totalPaid
      : creditor.balance;
    const payoff = calculatePayoff({
      principal: principalForCalculation,
      createdAt: creditor.created_at,
      dueDate: creditor.due_date,
      interestEnabled: creditor.interest_enabled === 1,
      interestRate: creditor.interest_rate || 0,
      overdueInterestRate: creditor.overdue_interest_rate ?? null,
      interestType: creditor.interest_type,
      completedAt: creditor.completed_at,
    });

    return {
      accruedInterest: payoff.accruedInterest,
      daysElapsed: payoff.daysElapsed,
      label: payoff.label,
      payoffTotal: creditor.completed_at ? totalPaid : payoff.payoffTotal,
      totalPaid,
    };
  }, [creditor, payments]);
  const baseRate = creditor?.interest_enabled ? creditor.interest_rate || 0 : 0;
  const overdueRate =
    creditor?.interest_enabled && (creditor.overdue_interest_rate ?? 0) > 0
      ? creditor.overdue_interest_rate!
      : null;

  if (!creditor || !stats) {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Tab details not found.</Text>
        </View>
      </ScreenContainer>
    );
  }

  const header = (
    <View className="px-5 py-4 flex-row items-center gap-4 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900">
      <Pressable
        onPress={() => router.back()}
        className="w-10 h-10 items-center justify-center p-2 active:opacity-50"
      >
        <Ionicons
          name="chevron-back"
          size={24}
          color={colorScheme === "dark" ? "#ffffff" : "#1f2937"}
        />
      </Pressable>
      <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
        My Tab Details
      </Text>
    </View>
  );

  return (
    <ScreenContainer
      header={header}
      edges={["top", "bottom"]}
      centerContent={false}
      scrollable={true}
    >
      <View className="bg-white dark:bg-gray-900 rounded-[32px] p-6 mx-6 shadow-2xl border border-gray-100 dark:border-gray-800 mt-4 mb-4">
        <View className="items-center mb-6">
          <View className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 items-center justify-center mb-3">
            <Ionicons name="wallet-outline" size={32} color="#f97316" />
          </View>
          <Text className="text-[10px] text-orange-500 font-black uppercase tracking-[4px] mb-1">
            Outstanding Snapshot
          </Text>
          <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {creditor.name}
          </Text>
          <Text className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mt-1 opacity-60">
            REF:{" "}
            {getReferenceLabel("tab", creditor.id, creditor.reference_code)}
          </Text>
        </View>

        <View className="border-t border-b border-dashed border-gray-200 dark:border-gray-800 py-4 my-1 gap-4">
          <View className="flex-row justify-between">
            <Text className="text-gray-400 dark:text-gray-500 font-medium">
              Remaining Amount
            </Text>
            <Text className="text-gray-900 dark:text-gray-100 font-bold">
              PHP {creditor.balance.toFixed(2)}
            </Text>
          </View>

          <View className="flex-row justify-between">
            <View>
              <Text className="text-gray-400 dark:text-gray-500 font-medium">
                Base Rate
              </Text>
              <Text className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                {creditor.interest_enabled
                  ? creditor.interest_type
                  : "No interest"}
              </Text>
            </View>
            <Text className="text-gray-900 dark:text-gray-100 font-bold">
              {creditor.interest_enabled ? `${baseRate}%` : "0%"}
            </Text>
          </View>

          <View className="flex-row justify-between">
            <View>
              <Text className="text-gray-400 dark:text-gray-500 font-medium">
                After Due Rate
              </Text>
              <Text className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                Applies only after due date
              </Text>
            </View>
            <Text className="text-gray-900 dark:text-gray-100 font-bold">
              {creditor.interest_enabled
                ? overdueRate !== null
                  ? `${overdueRate}%`
                  : "Same as base"
                : "N/A"}
            </Text>
          </View>

          <View className="flex-row justify-between">
            <View>
              <Text className="text-gray-400 dark:text-gray-500 font-medium">
                Due Date
              </Text>
              <Text className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                Deadline
              </Text>
            </View>
            <Text className="text-gray-900 dark:text-gray-100 font-bold">
              {formatDateLabel(creditor.due_date)}
            </Text>
          </View>

          <View className="flex-row justify-between">
            <Text className="text-gray-400 dark:text-gray-500 font-medium">
              Due Status
            </Text>
            <Text className="text-gray-900 dark:text-gray-100 font-bold">
              {getDueStatusLabel(creditor.due_date, creditor.completed_at)}
            </Text>
          </View>

          <View className="flex-row justify-between">
            <View>
              <Text className="text-gray-400 dark:text-gray-500 font-medium">
                Duration
              </Text>
              <Text className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                {stats.daysElapsed} days total
              </Text>
            </View>
            <Text className="text-gray-900 dark:text-gray-100 font-bold">
              {stats.label}
            </Text>
          </View>

          <View className="flex-row justify-between">
            <Text className="text-gray-400 dark:text-gray-500 font-medium font-black">
              Accumulated Interest
            </Text>
            <Text className="text-orange-500 font-black text-xl">
              + PHP {stats.accruedInterest.toFixed(2)}
            </Text>
          </View>
        </View>

        <View className="mt-6 items-center">
          <Text className="text-gray-400 dark:text-gray-500 uppercase text-[9px] font-black tracking-[4px] mb-2 text-center leading-4">
            Current Balance
            {"\n"}(if settled now)
          </Text>
          <Text className="text-4xl font-black text-gray-900 dark:text-gray-100">
            PHP {stats.payoffTotal.toFixed(2)}
          </Text>
        </View>

        <View className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 border-dashed">
          <View className="flex-row justify-between mb-1">
            <Text className="text-gray-400 dark:text-gray-500 font-medium text-xs">
              Total Paid (History)
            </Text>
            <Text className="text-sky-500 font-bold text-xs">
              PHP {stats.totalPaid.toFixed(2)}
            </Text>
          </View>
        </View>

        {creditor.description ? (
          <View className="mt-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
            <Text className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest mb-1 ml-1">
              Description
            </Text>
            <Text className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed italic">
              {`"${creditor.description}"`}
            </Text>
          </View>
        ) : null}

        <View className="mt-4 gap-2">
          <Text className="text-[9px] text-gray-400 dark:text-gray-500 text-center uppercase tracking-widest leading-relaxed">
            Started {new Date(creditor.created_at).toLocaleString()}
          </Text>
          {creditor.completed_at ? (
            <Text className="text-[9px] text-gray-400 dark:text-gray-500 text-center uppercase tracking-widest leading-relaxed">
              Completed {new Date(creditor.completed_at).toLocaleString()}
            </Text>
          ) : null}
        </View>
      </View>

      {payments.length > 0 && (
        <View className="mx-6 mb-10">
          <Text className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-[4px] mb-4 ml-2">
            Payment History
          </Text>
          <View className="bg-white dark:bg-gray-900 rounded-[32px] overflow-hidden border border-gray-100 dark:border-gray-800">
            {payments.map((payment, index) => (
              <View
                key={payment.id}
                className={`flex-row items-center justify-between p-4 ${index !== payments.length - 1 ? "border-b border-gray-50 dark:border-gray-800/50" : ""}`}
              >
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 items-center justify-center mr-3">
                    <Ionicons name="cash-outline" size={16} color="#10b981" />
                  </View>
                  <View>
                    <Text className="text-gray-900 dark:text-gray-100 font-bold text-sm">
                      PHP {payment.amount.toFixed(2)}
                    </Text>
                    <Text className="text-[10px] text-gray-400 dark:text-gray-500">
                      {new Date(payment.created_at).toLocaleString()}
                    </Text>
                  </View>
                </View>
                <View className="bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-full">
                  <Text className="text-[8px] font-black text-orange-500 uppercase tracking-widest">
                    Paid
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}
