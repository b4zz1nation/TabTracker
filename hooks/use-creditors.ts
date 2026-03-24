import { useSQLiteContext } from 'expo-sqlite';
import { useState, useCallback, useEffect, useMemo } from 'react';

export interface Creditor {
  id: number;
  name: string;
  balance: number;
  created_at: string;
}

export function useCreditors() {
  const db = useSQLiteContext();
  const [creditors, setCreditors] = useState<Creditor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCreditors = useCallback(async () => {
    try {
      setIsLoading(true);
      const allRows = await db.getAllAsync<Creditor>('SELECT * FROM creditors ORDER BY name ASC');
      setCreditors(allRows);
    } catch (error) {
      console.error('Error fetching creditors:', error);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  const addCreditor = useCallback(async (name: string, initialBalance: number = 0) => {
    try {
      const existing = await db.getFirstAsync<{ id: number }>('SELECT id FROM creditors WHERE LOWER(name) = LOWER(?)', [name.trim()]);
      if (existing) throw new Error('DUPLICATE_NAME');
      
      await db.runAsync(
        'INSERT INTO creditors (name, balance) VALUES (?, ?)',
        [name.trim(), initialBalance]
      );
      await fetchCreditors();
    } catch (error) {
      console.error('Error adding creditor:', error);
      throw error;
    }
  }, [db, fetchCreditors]);

  const updateCreditor = useCallback(async (id: number, name: string, balance: number) => {
    try {
      const existing = await db.getFirstAsync<{ id: number }>('SELECT id FROM creditors WHERE LOWER(name) = LOWER(?) AND id != ?', [name.trim(), id]);
      if (existing) throw new Error('DUPLICATE_NAME');

      await db.runAsync(
        'UPDATE creditors SET name = ?, balance = ? WHERE id = ?',
        [name.trim(), balance, id]
      );
      await fetchCreditors();
    } catch (error) {
      console.error('Error updating creditor:', error);
      throw error;
    }
  }, [db, fetchCreditors]);

  const deleteCreditor = useCallback(async (id: number) => {
    try {
      await db.runAsync('DELETE FROM creditors WHERE id = ?', [id]);
      await fetchCreditors();
    } catch (error) {
      console.error('Error deleting creditor:', error);
      throw error;
    }
  }, [db, fetchCreditors]);

  useEffect(() => {
    fetchCreditors();
  }, [fetchCreditors]);

  return useMemo(() => ({
    creditors,
    isLoading,
    addCreditor,
    updateCreditor,
    deleteCreditor,
    refresh: fetchCreditors,
  }), [creditors, isLoading, addCreditor, updateCreditor, deleteCreditor, fetchCreditors]);
}
