import { useSQLiteContext } from 'expo-sqlite';
import { useState, useCallback, useEffect } from 'react';

export interface Customer {
  id: number;
  name: string;
  balance: number;
  created_at: string;
}

export function useCustomers() {
  const db = useSQLiteContext();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      const allRows = await db.getAllAsync<Customer>('SELECT * FROM customers ORDER BY name ASC');
      setCustomers(allRows);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  const addCustomer = async (name: string, initialBalance: number = 0) => {
    try {
      await db.runAsync('INSERT INTO customers (name, balance) VALUES (?, ?)', [name, initialBalance]);
      await fetchCustomers();
    } catch (error) {
      console.error('Error adding customer:', error);
      throw error;
    }
  };

  const updateCustomer = async (id: number, name: string, balance: number) => {
    try {
      await db.runAsync('UPDATE customers SET name = ?, balance = ? WHERE id = ?', [name, balance, id]);
      await fetchCustomers();
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  };

  const deleteCustomer = async (id: number) => {
    try {
      await db.runAsync('DELETE FROM customers WHERE id = ?', [id]);
      await fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return {
    customers,
    isLoading,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    refresh: fetchCustomers,
  };
}
