import { useSQLiteContext } from "expo-sqlite";
import { useState, useCallback, useEffect, useMemo } from "react";
import { createUniqueReferenceForKind } from "@/services/reference";

export interface Lend {
  id: number;
  reference_code?: string | null;
  customer_id: number;
  amount: number;
  interest_enabled: number;
  interest_rate: number;
  interest_type: "Daily" | "Monthly" | "Yearly" | null;
  status: "Ongoing" | "Completed";
  description?: string | null;
  created_at: string;
  completed_at: string | null;
}

export function useLends() {
  const db = useSQLiteContext();
  const [lends, setLends] = useState<Lend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllLends = useCallback(async () => {
    try {
      setIsLoading(true);
      const rows = await db.getAllAsync<Lend>(
        "SELECT * FROM lends ORDER BY created_at DESC",
      );
      setLends(rows);
    } catch (error) {
      console.error("Error fetching lends:", error);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  const addLend = useCallback(
    async (
      customerId: number,
      amount: number,
      interestEnabled: boolean = false,
      interestRate: number = 0,
      interestType: "Daily" | "Monthly" | "Yearly" | null = null,
      description: string | null = null,
    ) => {
      const now = new Date().toISOString();
      const referenceCode = await createUniqueReferenceForKind(db, "lend");
      await db.runAsync(
        "INSERT INTO lends (reference_code, customer_id, amount, interest_enabled, interest_rate, interest_type, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          referenceCode,
          customerId,
          amount,
          interestEnabled ? 1 : 0,
          interestRate,
          interestType,
          description,
          now,
        ],
      );
      await fetchAllLends();
    },
    [db, fetchAllLends],
  );

  const updateLend = useCallback(
    async (
      id: number,
      amount: number,
      interestEnabled: boolean = false,
      interestRate: number = 0,
      interestType: "Daily" | "Monthly" | "Yearly" | null = null,
      description: string | null = null,
    ) => {
      await db.runAsync(
        "UPDATE lends SET amount = ?, interest_enabled = ?, interest_rate = ?, interest_type = ?, description = ? WHERE id = ?",
        [
          amount,
          interestEnabled ? 1 : 0,
          interestRate,
          interestType,
          description,
          id,
        ],
      );
      await fetchAllLends();
    },
    [db, fetchAllLends],
  );

  const completeLend = useCallback(
    async (id: number) => {
      const now = new Date().toISOString();
      await db.runAsync(
        "UPDATE lends SET status = 'Completed', completed_at = ? WHERE id = ?",
        [now, id],
      );
      await fetchAllLends();
    },
    [db, fetchAllLends],
  );

  const addPayment = useCallback(
    async (lendId: number, paymentAmount: number) => {
      const lend = lends.find((l) => l.id === lendId);
      if (!lend) return;

      const now = new Date().toISOString();
      const newAmount = lend.amount - paymentAmount;

      // 1. Record payment
      await db.runAsync(
        "INSERT INTO payments (lend_id, amount, created_at) VALUES (?, ?, ?)",
        [lendId, paymentAmount, now],
      );

      // 2. Update lend amount
      if (newAmount <= 0) {
        await db.runAsync(
          "UPDATE lends SET amount = 0, status = 'Completed', completed_at = ? WHERE id = ?",
          [now, lendId],
        );
      } else {
        await db.runAsync("UPDATE lends SET amount = ? WHERE id = ?", [
          newAmount,
          lendId,
        ]);
      }

      // 3. Update customer balance (sum of all ongoing lends)
      const ongoingLends = await db.getAllAsync<{ amount: number }>(
        "SELECT amount FROM lends WHERE customer_id = ? AND status = 'Ongoing'",
        [lend.customer_id],
      );
      const newTotalBalance = ongoingLends.reduce(
        (sum, l) => sum + l.amount,
        0,
      );
      await db.runAsync("UPDATE customers SET balance = ? WHERE id = ?", [
        newTotalBalance,
        lend.customer_id,
      ]);

      await fetchAllLends();
    },
    [db, lends, fetchAllLends],
  );

  const deleteLend = useCallback(
    async (id: number) => {
      await db.runAsync("DELETE FROM lends WHERE id = ?", [id]);
      await fetchAllLends();
    },
    [db, fetchAllLends],
  );

  const getPayments = useCallback(
    async (lendId: number) => {
      return await db.getAllAsync<{
        id: number;
        amount: number;
        created_at: string;
      }>("SELECT * FROM payments WHERE lend_id = ? ORDER BY created_at DESC", [
        lendId,
      ]);
    },
    [db],
  );

  const getPaymentsByCustomer = useCallback(
    async (customerId: number) => {
      return await db.getAllAsync<{
        id: number;
        amount: number;
        created_at: string;
        lend_id: number;
      }>(
        "SELECT p.* FROM payments p JOIN lends l ON p.lend_id = l.id WHERE l.customer_id = ? ORDER BY p.created_at DESC",
        [customerId],
      );
    },
    [db],
  );

  const getAllPayments = useCallback(async () => {
    return await db.getAllAsync<{
      id: number;
      amount: number;
      created_at: string;
      lend_id: number;
    }>("SELECT * FROM payments ORDER BY created_at DESC");
  }, [db]);

  useEffect(() => {
    fetchAllLends();
  }, [fetchAllLends]);

  return useMemo(
    () => ({
      lends,
      isLoading,
      addLend,
      updateLend,
      completeLend,
      addPayment,
      getPayments,
      getPaymentsByCustomer,
      getAllPayments,
      deleteLend,
      refresh: fetchAllLends,
    }),
    [
      lends,
      isLoading,
      addLend,
      updateLend,
      completeLend,
      addPayment,
      getPayments,
      getPaymentsByCustomer,
      getAllPayments,
      deleteLend,
      fetchAllLends,
    ],
  );
}
