import { useSQLiteContext } from "expo-sqlite";
import { useState, useCallback, useEffect, useMemo } from "react";

export interface Customer {
  id: number;
  name: string;
  balance: number;
  created_at: string;
  interest_enabled: number;
  interest_rate: number;
  interest_type: "Daily" | "Monthly" | "Yearly" | null;
}

export function useCustomers() {
  const db = useSQLiteContext();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isTransientDbError = useCallback((error: unknown) => {
    if (!(error instanceof Error)) {
      return false;
    }

    return (
      error.message.includes(
        "Cannot use shared object that was already released",
      ) || error.message.includes("NativeDatabase.prepareAsync")
    );
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      let allRows: Customer[] = [];

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          allRows = await db.getAllAsync<Customer>(
            "SELECT * FROM customers ORDER BY name ASC",
          );
          break;
        } catch (error) {
          if (!isTransientDbError(error) || attempt === 1) {
            throw error;
          }
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      setCustomers(allRows);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setIsLoading(false);
    }
  }, [db, isTransientDbError]);

  const addCustomer = useCallback(
    async (
      name: string,
      initialBalance: number = 0,
      interestEnabled: boolean = false,
      interestRate: number = 0,
      interestType: "Daily" | "Monthly" | "Yearly" | null = null,
    ) => {
      try {
        const existing = await db.getFirstAsync<{ id: number }>(
          "SELECT id FROM customers WHERE LOWER(name) = LOWER(?)",
          [name.trim()],
        );
        if (existing) throw new Error("DUPLICATE_NAME");

        await db.runAsync(
          "INSERT INTO customers (name, balance, interest_enabled, interest_rate, interest_type) VALUES (?, ?, ?, ?, ?)",
          [
            name.trim(),
            initialBalance,
            interestEnabled ? 1 : 0,
            interestRate,
            interestType,
          ],
        );
        await fetchCustomers();
      } catch (error) {
        console.error("Error adding customer:", error);
        throw error;
      }
    },
    [db, fetchCustomers],
  );

  const updateCustomer = useCallback(
    async (
      id: number,
      name: string,
      balance: number,
      interestEnabled: boolean = false,
      interestRate: number = 0,
      interestType: "Daily" | "Monthly" | "Yearly" | null = null,
    ) => {
      try {
        const existing = await db.getFirstAsync<{ id: number }>(
          "SELECT id FROM customers WHERE LOWER(name) = LOWER(?) AND id != ?",
          [name.trim(), id],
        );
        if (existing) throw new Error("DUPLICATE_NAME");

        await db.runAsync(
          "UPDATE customers SET name = ?, balance = ?, interest_enabled = ?, interest_rate = ?, interest_type = ? WHERE id = ?",
          [
            name.trim(),
            balance,
            interestEnabled ? 1 : 0,
            interestRate,
            interestType,
            id,
          ],
        );
        await fetchCustomers();
      } catch (error) {
        console.error("Error updating customer:", error);
        throw error;
      }
    },
    [db, fetchCustomers],
  );

  const deleteCustomer = useCallback(
    async (id: number) => {
      try {
        await db.runAsync("DELETE FROM customers WHERE id = ?", [id]);
        await fetchCustomers();
      } catch (error) {
        console.error("Error deleting customer:", error);
        throw error;
      }
    },
    [db, fetchCustomers],
  );

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return useMemo(
    () => ({
      customers,
      isLoading,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      refresh: fetchCustomers,
    }),
    [
      customers,
      isLoading,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      fetchCustomers,
    ],
  );
}
