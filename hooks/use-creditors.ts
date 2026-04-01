import { useSQLiteContext } from "expo-sqlite";
import { useState, useCallback, useEffect, useMemo } from "react";
import {
  formatNotificationCopy,
  getNotificationPayloadData,
  insertNotificationRecord,
  requestNotificationPermission,
  scheduleLocalNotification,
} from "@/services/notifications";
import { createUniqueReferenceForKind } from "@/services/reference";

export interface Creditor {
  id: number;
  reference_code?: string | null;
  name: string;
  balance: number;
  description?: string | null;
  interest_enabled: number;
  interest_rate: number;
  overdue_interest_rate?: number | null;
  interest_type: "Daily" | "Monthly" | "Yearly" | null;
  start_date?: string | null;
  due_date?: string | null;
  reminders_enabled?: number;
  last_reminder_type?: string | null;
  last_reminder_at?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface CreditorPayment {
  id: number;
  creditor_id: number;
  amount: number;
  created_at: string;
}

export function useCreditors() {
  const db = useSQLiteContext();
  const [creditors, setCreditors] = useState<Creditor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCreditors = useCallback(async () => {
    try {
      setIsLoading(true);
      const allRows = await db.getAllAsync<Creditor>(
        "SELECT * FROM creditors ORDER BY name ASC",
      );
      setCreditors(allRows);
    } catch (error) {
      console.error("Error fetching creditors:", error);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  const addCreditor = useCallback(
    async (
      name: string,
      initialBalance: number = 0,
      description: string | null = null,
      interestEnabled: boolean = false,
      interestRate: number = 0,
      interestType: "Daily" | "Monthly" | "Yearly" | null = null,
      overdueInterestRate: number | null = null,
      startDate: string | null = null,
      dueDate: string | null = null,
      remindersEnabled: boolean = true,
      options?: {
        allowDuplicateName?: boolean;
      },
    ) => {
      try {
        if (!options?.allowDuplicateName) {
          const existing = await db.getFirstAsync<{ id: number }>(
            "SELECT id FROM creditors WHERE LOWER(name) = LOWER(?)",
            [name.trim()],
          );
          if (existing) throw new Error("DUPLICATE_NAME");
        }

        const now = new Date().toISOString();
        const referenceCode = await createUniqueReferenceForKind(db, "tab");
        await db.runAsync(
          "INSERT INTO creditors (reference_code, name, balance, description, interest_enabled, interest_rate, overdue_interest_rate, interest_type, start_date, due_date, reminders_enabled, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            referenceCode,
            name.trim(),
            initialBalance,
            description,
            interestEnabled ? 1 : 0,
            interestRate,
            overdueInterestRate,
            interestType,
            startDate ?? now,
            dueDate,
            remindersEnabled ? 1 : 0,
            null,
          ],
        );
        await fetchCreditors();
      } catch (error) {
        if (!(error instanceof Error && error.message === "DUPLICATE_NAME")) {
          console.error("Error adding creditor:", error);
        }
        throw error;
      }
    },
    [db, fetchCreditors],
  );

  const updateCreditor = useCallback(
    async (
      id: number,
      name: string,
      balance: number,
      description: string | null = null,
      interestEnabled: boolean = false,
      interestRate: number = 0,
      interestType: "Daily" | "Monthly" | "Yearly" | null = null,
      overdueInterestRate: number | null = null,
      startDate: string | null = null,
      dueDate: string | null = null,
      remindersEnabled: boolean = true,
    ) => {
      try {
        const existing = await db.getFirstAsync<{ id: number }>(
          "SELECT id FROM creditors WHERE LOWER(name) = LOWER(?) AND id != ?",
          [name.trim(), id],
        );
        if (existing) throw new Error("DUPLICATE_NAME");

        await db.runAsync(
          "UPDATE creditors SET name = ?, balance = ?, description = ?, interest_enabled = ?, interest_rate = ?, overdue_interest_rate = ?, interest_type = ?, start_date = ?, due_date = ?, reminders_enabled = ?, completed_at = CASE WHEN ? <= 0 THEN COALESCE(completed_at, CURRENT_TIMESTAMP) ELSE NULL END WHERE id = ?",
          [
            name.trim(),
            balance,
            description,
            interestEnabled ? 1 : 0,
            interestRate,
            overdueInterestRate,
            interestType,
            startDate,
            dueDate,
            remindersEnabled ? 1 : 0,
            balance,
            id,
          ],
        );
        await fetchCreditors();
      } catch (error) {
        if (!(error instanceof Error && error.message === "DUPLICATE_NAME")) {
          console.error("Error updating creditor:", error);
        }
        throw error;
      }
    },
    [db, fetchCreditors],
  );

  const deleteCreditor = useCallback(
    async (id: number) => {
      try {
        await db.runAsync("DELETE FROM creditors WHERE id = ?", [id]);
        await fetchCreditors();
      } catch (error) {
        console.error("Error deleting creditor:", error);
        throw error;
      }
    },
    [db, fetchCreditors],
  );

  const getPayments = useCallback(
    async (creditorId: number) => {
      return await db.getAllAsync<CreditorPayment>(
        "SELECT * FROM creditor_payments WHERE creditor_id = ? ORDER BY created_at DESC",
        [creditorId],
      );
    },
    [db],
  );

  const getAllPayments = useCallback(async () => {
    return await db.getAllAsync<CreditorPayment>(
      "SELECT * FROM creditor_payments ORDER BY created_at DESC",
    );
  }, [db]);

  const addPayment = useCallback(
    async (creditorId: number, paymentAmount: number) => {
      const creditor = creditors.find((item) => item.id === creditorId);
      if (!creditor) return;

      const now = new Date().toISOString();
      const nextBalance = Math.max(0, (creditor.balance || 0) - paymentAmount);

      await db.runAsync(
        "INSERT INTO creditor_payments (creditor_id, amount, created_at) VALUES (?, ?, ?)",
        [creditorId, paymentAmount, now],
      );

      if (nextBalance <= 0) {
        await db.runAsync(
          "UPDATE creditors SET balance = 0, completed_at = ? WHERE id = ?",
          [now, creditorId],
        );
      } else {
        await db.runAsync(
          "UPDATE creditors SET balance = ?, completed_at = NULL WHERE id = ?",
          [nextBalance, creditorId],
        );
      }

      const titleBody = formatNotificationCopy({
        entityType: "tab",
        entityId: creditorId,
        referenceCode: creditor.reference_code ?? creditorId.toString(),
        kind: "payment_sent",
        counterpartyName: creditor.name,
        amount: paymentAmount,
      });
      const notificationPayload = getNotificationPayloadData(
        "tab",
        creditorId,
        creditor.reference_code,
      );
      const dedupeKey = `tab:${creditor.reference_code ?? creditorId}:payment_sent:${now}`;

      await insertNotificationRecord(db, {
        entityType: "tab",
        entityId: creditorId,
        referenceCode: creditor.reference_code ?? null,
        kind: "payment_sent",
        title: titleBody.title,
        body: titleBody.body,
        sentAt: now,
        dedupeKey,
      });

      const permission = await requestNotificationPermission();
      if (permission.granted) {
        await scheduleLocalNotification(
          titleBody.title,
          titleBody.body,
          notificationPayload,
        );
      }

      await fetchCreditors();
    },
    [creditors, db, fetchCreditors],
  );

  const completeCreditor = useCallback(
    async (creditorId: number) => {
      const creditor = await db.getFirstAsync<Creditor>(
        "SELECT * FROM creditors WHERE id = ?",
        [creditorId],
      );
      if (!creditor) return;

      const remaining = creditor.balance || 0;
      if (remaining > 0) {
        await db.runAsync(
          "INSERT INTO creditor_payments (creditor_id, amount, created_at) VALUES (?, ?, ?)",
          [creditorId, remaining, new Date().toISOString()],
        );
      }
      await db.runAsync(
        "UPDATE creditors SET balance = 0, completed_at = ? WHERE id = ?",
        [new Date().toISOString(), creditorId],
      );
      await fetchCreditors();
    },
    [db, fetchCreditors],
  );

  useEffect(() => {
    fetchCreditors();
  }, [fetchCreditors]);

  return useMemo(
    () => ({
      creditors,
      isLoading,
      addCreditor,
      updateCreditor,
      deleteCreditor,
      getPayments,
      getAllPayments,
      addPayment,
      completeCreditor,
      refresh: fetchCreditors,
    }),
    [
      creditors,
      isLoading,
      addCreditor,
      updateCreditor,
      deleteCreditor,
      getPayments,
      getAllPayments,
      addPayment,
      completeCreditor,
      fetchCreditors,
    ],
  );
}
