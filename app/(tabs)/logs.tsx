import React, { useCallback, useMemo, useRef, useState } from "react";
import { View, Text, FlatList, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import ScreenContainer from "@/components/screen-container";
import { useLends } from "@/hooks/use-lends";
import { useCustomers } from "@/hooks/use-customers";
import { useCreditors } from "@/hooks/use-creditors";
import { getReferenceLabel } from "@/services/reference";

type Activity = {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  type: "info" | "payment" | "success";
};

type LogGroup = {
  id: string;
  kind: "lend" | "creditor";
  title: string;
  refId: number;
  referenceCode?: string | null;
  status: "Ongoing" | "Completed";
  latestDate: string;
  initialPrincipal: number;
  totalPaid: number;
  accentColor: string;
  ctaColor: string;
  activities: Activity[];
};

const ActivityRow = React.memo(({ act }: { act: Activity }) => {
  const getIcon = (type: Activity["type"]) => {
    if (type === "success") {
      return {
        name: "checkmark-done-circle",
        color: "#10b981",
        bg: "bg-emerald-100 dark:bg-emerald-900/40",
      };
    }
    if (type === "payment") {
      return {
        name: "cash-outline",
        color: "#0ea5e9",
        bg: "bg-sky-100 dark:bg-sky-900/40",
      };
    }
    return {
      name: "add-circle",
      color: "#8b5cf6",
      bg: "bg-violet-100 dark:bg-violet-900/40",
    };
  };
  const icon = getIcon(act.type);
  return (
    <View className="flex-row items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
      <View className="flex-row items-center flex-1">
        <View
          className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${icon.bg}`}
        >
          <Ionicons name={icon.name as never} size={16} color={icon.color} />
        </View>
        <View className="flex-1">
          <Text
            className="text-[11px] font-black text-gray-900 dark:text-gray-100"
            numberOfLines={1}
          >
            {act.title}
          </Text>
          <Text className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-tight">
            {new Date(act.date).toLocaleDateString()} •{" "}
            {new Date(act.date).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
      <Text className="text-[12px] font-black text-gray-900 dark:text-gray-100 ml-2">
        {act.subtitle}
      </Text>
    </View>
  );
});
ActivityRow.displayName = "ActivityRow";

const LogCard = React.memo(({ group }: { group: LogGroup }) => {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const toValue = isExpanded ? 0 : 1;
    Animated.parallel([
      Animated.spring(expandAnim, {
        toValue,
        damping: 28,
        stiffness: 300,
        useNativeDriver: false,
      }),
      Animated.spring(rotateAnim, {
        toValue,
        damping: 28,
        stiffness: 300,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setIsExpanded(!isExpanded);
    });
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const height = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 600],
  });

  const handleViewDetails = () => {
    if (group.kind === "lend") {
      router.push(`/lend-details/${group.refId}`);
      return;
    }
    router.push({
      pathname: "/my-tab-modal",
      params: {
        id: group.refId.toString(),
        readOnly: group.status === "Completed" ? "true" : "false",
      },
    });
  };

  return (
    <View className="mx-4 mb-4">
      <Pressable
        onPress={toggle}
        className="bg-white dark:bg-gray-900 rounded-[28px] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden"
      >
        <View className="p-5">
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              <View
                className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                  group.status === "Completed"
                    ? "bg-emerald-50 dark:bg-emerald-900/20"
                    : group.kind === "creditor"
                      ? "bg-orange-50 dark:bg-orange-900/20"
                      : "bg-sky-50 dark:bg-sky-900/20"
                }`}
              >
                <Ionicons
                  name={
                    group.status === "Completed" ? "checkmark-circle" : "pulse"
                  }
                  size={24}
                  color={
                    group.status === "Completed" ? "#10b981" : group.accentColor
                  }
                />
              </View>
              <View>
                <Text className="text-lg font-black text-gray-900 dark:text-gray-100">
                  {group.title}
                </Text>
                <Text className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest">
                  REF:{" "}
                  {getReferenceLabel(
                    group.kind === "lend" ? "lend" : "tab",
                    group.refId,
                    group.referenceCode,
                  )}
                </Text>
              </View>
            </View>
            <Animated.View style={{ transform: [{ rotate: rotation }] }}>
              <Ionicons name="chevron-down" size={20} color="#9ca3af" />
            </Animated.View>
          </View>

          <View className="flex-row gap-4">
            <View className="flex-1">
              <Text className="text-[9px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest mb-1">
                Principal
              </Text>
              <Text className="text-base font-black text-gray-900 dark:text-gray-100">
                PHP {group.initialPrincipal.toFixed(2)}
              </Text>
            </View>
            <View className="flex-1 items-end">
              <Text className="text-[9px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest mb-1">
                Total Settled
              </Text>
              <Text className="text-base font-black text-emerald-500">
                PHP {group.totalPaid.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        <Animated.View
          style={{ maxHeight: height, opacity: expandAnim, overflow: "hidden" }}
        >
          <View className="bg-gray-50 dark:bg-gray-800/20 px-4 pt-2 pb-5 border-t border-gray-50 dark:border-gray-800/50">
            <Text className="text-[8px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-[3px] mb-3 mt-2 ml-1 text-center font-mono">
              --- Activity Sequence ---
            </Text>
            <View className="gap-2">
              {group.activities.map((act) => (
                <ActivityRow key={act.id} act={act} />
              ))}
            </View>
            <Pressable
              onPress={handleViewDetails}
              className="mt-4 flex-row items-center justify-center gap-2 active:opacity-50"
            >
              <Text
                className="text-[10px] font-black uppercase tracking-widest"
                style={{ color: group.ctaColor }}
              >
                View Full Details
              </Text>
              <Ionicons name="arrow-forward" size={14} color={group.ctaColor} />
            </Pressable>
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
});
LogCard.displayName = "LogCard";

export default function LogsScreen() {
  const { lends, refresh: refreshLends, getAllPayments } = useLends();
  const { customers, refresh: refreshCustomers } = useCustomers();
  const {
    creditors,
    refresh: refreshCreditors,
    getAllPayments: getAllCreditorPayments,
  } = useCreditors();
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [allCreditorPayments, setAllCreditorPayments] = useState<any[]>([]);

  const fetchAll = useCallback(async () => {
    refreshLends();
    refreshCustomers();
    refreshCreditors();

    const [payments, creditorPayments] = await Promise.all([
      getAllPayments(),
      getAllCreditorPayments(),
    ]);
    setAllPayments(payments);
    setAllCreditorPayments(creditorPayments);
  }, [
    refreshLends,
    refreshCustomers,
    refreshCreditors,
    getAllPayments,
    getAllCreditorPayments,
  ]);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll]),
  );

  const groupedLogs = useMemo(() => {
    const lendGroups: LogGroup[] = lends.map((lend) => {
      const customer = customers.find((c) => c.id === lend.customer_id);
      const payments = allPayments.filter(
        (payment) => payment.lend_id === lend.id,
      );
      const totalPayments = payments.reduce(
        (sum, payment) => sum + payment.amount,
        0,
      );
      const initialPrincipal = lend.amount + totalPayments;
      const activities: Activity[] = [
        {
          id: `lend_${lend.id}`,
          title: "New Lend Added",
          subtitle: `PHP ${initialPrincipal.toFixed(2)}`,
          date: lend.created_at,
          type: "info",
        },
        ...payments.map((payment) => ({
          id: `pay_${payment.id}`,
          title: "Payment Received",
          subtitle: `PHP ${payment.amount.toFixed(2)}`,
          date: payment.created_at,
          type: "payment" as const,
        })),
      ];

      if (lend.status === "Completed" && lend.completed_at) {
        activities.push({
          id: `comp_${lend.id}`,
          title: "Loan Settled",
          subtitle: `PHP ${totalPayments.toFixed(2)}`,
          date: lend.completed_at,
          type: "success",
        });
      }

      const latestDate = activities.reduce(
        (max, current) =>
          new Date(current.date).getTime() > new Date(max).getTime()
            ? current.date
            : max,
        lend.created_at,
      );

      return {
        id: `lend-${lend.id}`,
        kind: "lend",
        title: customer?.name || "Unknown",
        refId: lend.id,
        referenceCode: lend.reference_code,
        status: lend.status,
        latestDate,
        totalPaid: totalPayments,
        initialPrincipal,
        accentColor: "#38bdf8",
        ctaColor: "#0ea5e9",
        activities: activities.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
      };
    });

    const creditorGroups: LogGroup[] = creditors.map((creditor) => {
      const payments = allCreditorPayments.filter(
        (payment) => payment.creditor_id === creditor.id,
      );
      const totalPayments = payments.reduce(
        (sum, payment) => sum + payment.amount,
        0,
      );
      const initialPrincipal = creditor.balance + totalPayments;
      const status = creditor.balance > 0 ? "Ongoing" : "Completed";
      const activities: Activity[] = [
        {
          id: `creditor_${creditor.id}`,
          title: "New Tab Added",
          subtitle: `PHP ${initialPrincipal.toFixed(2)}`,
          date: creditor.created_at,
          type: "info",
        },
        ...payments.map((payment) => ({
          id: `creditor_pay_${payment.id}`,
          title: "Payment Made",
          subtitle: `PHP ${payment.amount.toFixed(2)}`,
          date: payment.created_at,
          type: "payment" as const,
        })),
      ];

      if (status === "Completed" && payments.length > 0) {
        activities.push({
          id: `creditor_comp_${creditor.id}`,
          title: "Tab Settled",
          subtitle: `PHP ${totalPayments.toFixed(2)}`,
          date: payments[0].created_at,
          type: "success",
        });
      }

      const latestDate = activities.reduce(
        (max, current) =>
          new Date(current.date).getTime() > new Date(max).getTime()
            ? current.date
            : max,
        creditor.created_at,
      );

      return {
        id: `creditor-${creditor.id}`,
        kind: "creditor",
        title: creditor.name,
        refId: creditor.id,
        referenceCode: creditor.reference_code,
        status,
        latestDate,
        totalPaid: totalPayments,
        initialPrincipal,
        accentColor: "#f97316",
        ctaColor: "#f97316",
        activities: activities.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
      };
    });

    return [...lendGroups, ...creditorGroups].sort(
      (a, b) =>
        new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime(),
    );
  }, [lends, customers, creditors, allPayments, allCreditorPayments]);

  return (
    <ScreenContainer
      scrollable={false}
      header={
        <View className="px-5 py-4">
          <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Activity Logs
          </Text>
        </View>
      }
    >
      <FlatList
        data={groupedLogs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <LogCard group={item} />}
        contentContainerStyle={{ paddingVertical: 10 }}
        windowSize={5}
        removeClippedSubviews={true}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        ListEmptyComponent={
          <View className="items-center mt-20 gap-3">
            <Ionicons name="journal-outline" size={64} color="#d1d5db" />
            <Text className="text-gray-400 text-center px-10">
              No recent activity found.
            </Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}
