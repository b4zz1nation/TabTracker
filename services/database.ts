import * as SQLite from "expo-sqlite";
import { createUniqueReferenceForKind, isUuidV7 } from "@/services/reference";

export async function migrateDbIfNeeded(db: SQLite.SQLiteDatabase) {
  const DATABASE_VERSION = 10;
  let result = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  let currentDbVersion = result?.user_version ?? 0;

  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentDbVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        balance REAL DEFAULT 0,
        interest_enabled INTEGER DEFAULT 0,
        interest_rate REAL DEFAULT 0,
        interest_type TEXT DEFAULT 'Monthly',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    currentDbVersion = 1;
  }

  if (currentDbVersion < 2) {
    const columns = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(customers)",
    );
    const columnNames = new Set(columns.map((col) => col.name));

    if (!columnNames.has("interest_enabled")) {
      await db.execAsync(
        "ALTER TABLE customers ADD COLUMN interest_enabled INTEGER DEFAULT 0;",
      );
    }
    if (!columnNames.has("interest_rate")) {
      await db.execAsync(
        "ALTER TABLE customers ADD COLUMN interest_rate REAL DEFAULT 0;",
      );
    }
    if (!columnNames.has("interest_type")) {
      await db.execAsync(
        "ALTER TABLE customers ADD COLUMN interest_type TEXT DEFAULT 'Monthly';",
      );
    }

    currentDbVersion = 2;
  }

  if (currentDbVersion < 3) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS lends (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        interest_enabled INTEGER DEFAULT 0,
        interest_rate REAL DEFAULT 0,
        interest_type TEXT DEFAULT NULL,
        status TEXT DEFAULT 'Ongoing',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME DEFAULT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      );
    `);

    // Migrate existing customer balances into lend entries
    const existing = await db.getAllAsync<{
      id: number;
      balance: number;
      interest_enabled: number;
      interest_rate: number;
      interest_type: string | null;
    }>(
      "SELECT id, balance, interest_enabled, interest_rate, interest_type FROM customers WHERE balance != 0",
    );

    for (const c of existing) {
      await db.runAsync(
        "INSERT INTO lends (customer_id, amount, interest_enabled, interest_rate, interest_type) VALUES (?, ?, ?, ?, ?)",
        [c.id, c.balance, c.interest_enabled, c.interest_rate, c.interest_type],
      );
    }

    currentDbVersion = 3;
  }

  if (currentDbVersion < 4) {
    const columns = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(lends)",
    );
    const columnNames = new Set(columns.map((col) => col.name));

    if (!columnNames.has("description")) {
      await db.execAsync(
        "ALTER TABLE lends ADD COLUMN description TEXT DEFAULT NULL;",
      );
    }
    currentDbVersion = 4;
  }

  if (currentDbVersion < 5) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lend_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lend_id) REFERENCES lends(id) ON DELETE CASCADE
      );
    `);
    currentDbVersion = 5;
  }

  if (currentDbVersion < 6) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS creditors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        balance REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    currentDbVersion = 6;
  }

  if (currentDbVersion < 7) {
    const columns = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(creditors)",
    );
    const columnNames = new Set(columns.map((col) => col.name));

    if (!columnNames.has("description")) {
      await db.execAsync(
        "ALTER TABLE creditors ADD COLUMN description TEXT DEFAULT NULL;",
      );
    }
    if (!columnNames.has("interest_enabled")) {
      await db.execAsync(
        "ALTER TABLE creditors ADD COLUMN interest_enabled INTEGER DEFAULT 0;",
      );
    }
    if (!columnNames.has("interest_rate")) {
      await db.execAsync(
        "ALTER TABLE creditors ADD COLUMN interest_rate REAL DEFAULT 0;",
      );
    }
    if (!columnNames.has("interest_type")) {
      await db.execAsync(
        "ALTER TABLE creditors ADD COLUMN interest_type TEXT DEFAULT NULL;",
      );
    }

    currentDbVersion = 7;
  }

  if (currentDbVersion < 8) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS creditor_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        creditor_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (creditor_id) REFERENCES creditors(id) ON DELETE CASCADE
      );
    `);
    currentDbVersion = 8;
  }

  if (currentDbVersion < 9) {
    const lendColumns = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(lends)",
    );
    const lendColumnNames = new Set(lendColumns.map((col) => col.name));

    if (!lendColumnNames.has("reference_code")) {
      await db.execAsync(
        "ALTER TABLE lends ADD COLUMN reference_code TEXT DEFAULT NULL;",
      );
    }

    const creditorColumns = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(creditors)",
    );
    const creditorColumnNames = new Set(creditorColumns.map((col) => col.name));

    if (!creditorColumnNames.has("reference_code")) {
      await db.execAsync(
        "ALTER TABLE creditors ADD COLUMN reference_code TEXT DEFAULT NULL;",
      );
    }

    const lendsWithoutReference = await db.getAllAsync<{ id: number }>(
      "SELECT id FROM lends WHERE reference_code IS NULL OR TRIM(reference_code) = ''",
    );

    for (const lend of lendsWithoutReference) {
      const referenceCode = await createUniqueReferenceForKind(db, "lend");
      await db.runAsync("UPDATE lends SET reference_code = ? WHERE id = ?", [
        referenceCode,
        lend.id,
      ]);
    }

    const creditorsWithoutReference = await db.getAllAsync<{ id: number }>(
      "SELECT id FROM creditors WHERE reference_code IS NULL OR TRIM(reference_code) = ''",
    );

    for (const creditor of creditorsWithoutReference) {
      const referenceCode = await createUniqueReferenceForKind(db, "tab");
      await db.runAsync(
        "UPDATE creditors SET reference_code = ? WHERE id = ?",
        [referenceCode, creditor.id],
      );
    }

    await db.execAsync(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_lends_reference_code ON lends(reference_code);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_creditors_reference_code ON creditors(reference_code);
    `);

    currentDbVersion = 9;
  }

  if (currentDbVersion < 10) {
    const lendsWithLegacyReference = await db.getAllAsync<{
      id: number;
      reference_code: string | null;
    }>("SELECT id, reference_code FROM lends");

    for (const lend of lendsWithLegacyReference) {
      if (isUuidV7(lend.reference_code)) {
        continue;
      }

      const referenceCode = await createUniqueReferenceForKind(db, "lend");
      await db.runAsync("UPDATE lends SET reference_code = ? WHERE id = ?", [
        referenceCode,
        lend.id,
      ]);
    }

    const creditorsWithLegacyReference = await db.getAllAsync<{
      id: number;
      reference_code: string | null;
    }>("SELECT id, reference_code FROM creditors");

    for (const creditor of creditorsWithLegacyReference) {
      if (isUuidV7(creditor.reference_code)) {
        continue;
      }

      const referenceCode = await createUniqueReferenceForKind(db, "tab");
      await db.runAsync(
        "UPDATE creditors SET reference_code = ? WHERE id = ?",
        [referenceCode, creditor.id],
      );
    }

    currentDbVersion = 10;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
