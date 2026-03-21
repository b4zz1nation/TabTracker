import { useSQLiteContext } from 'expo-sqlite';
import { useState, useCallback, useEffect } from 'react';

export interface Lend {
  id: number;
  customer_id: number;
  amount: number;
  interest_enabled: number;
  interest_rate: number;
  interest_type: 'Daily' | 'Monthly' | 'Yearly' | null;
  status: 'Ongoing' | 'Completed';
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
        'SELECT * FROM lends ORDER BY created_at DESC'
      );
      setLends(rows);
    } catch (error) {
      console.error('Error fetching lends:', error);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  const addLend = async (
    customerId: number,
    amount: number,
    interestEnabled: boolean = false,
    interestRate: number = 0,
    interestType: 'Daily' | 'Monthly' | 'Yearly' | null = null
  ) => {
    await db.runAsync(
      'INSERT INTO lends (customer_id, amount, interest_enabled, interest_rate, interest_type) VALUES (?, ?, ?, ?, ?)',
      [customerId, amount, interestEnabled ? 1 : 0, interestRate, interestType]
    );
    await fetchAllLends();
  };

  const updateLend = async (
    id: number,
    amount: number,
    interestEnabled: boolean = false,
    interestRate: number = 0,
    interestType: 'Daily' | 'Monthly' | 'Yearly' | null = null
  ) => {
    await db.runAsync(
      'UPDATE lends SET amount = ?, interest_enabled = ?, interest_rate = ?, interest_type = ? WHERE id = ?',
      [amount, interestEnabled ? 1 : 0, interestRate, interestType, id]
    );
    await fetchAllLends();
  };

  const completeLend = async (id: number) => {
    await db.runAsync(
      "UPDATE lends SET status = 'Completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?",
      [id]
    );
    await fetchAllLends();
  };

  const deleteLend = async (id: number) => {
    await db.runAsync('DELETE FROM lends WHERE id = ?', [id]);
    await fetchAllLends();
  };

  useEffect(() => {
    fetchAllLends();
  }, [fetchAllLends]);

  return {
    lends,
    isLoading,
    addLend,
    updateLend,
    completeLend,
    deleteLend,
    refresh: fetchAllLends,
  };
}
