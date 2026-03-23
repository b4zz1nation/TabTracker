import * as SQLite from 'expo-sqlite';

export async function migrateDbIfNeeded(db: SQLite.SQLiteDatabase) {
  const DATABASE_VERSION = 5;
  let result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
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
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(customers)');
    const columnNames = new Set(columns.map((col) => col.name));

    if (!columnNames.has('interest_enabled')) {
      await db.execAsync('ALTER TABLE customers ADD COLUMN interest_enabled INTEGER DEFAULT 0;');
    }
    if (!columnNames.has('interest_rate')) {
      await db.execAsync('ALTER TABLE customers ADD COLUMN interest_rate REAL DEFAULT 0;');
    }
    if (!columnNames.has('interest_type')) {
      await db.execAsync("ALTER TABLE customers ADD COLUMN interest_type TEXT DEFAULT 'Monthly';");
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
      id: number; balance: number; interest_enabled: number;
      interest_rate: number; interest_type: string | null;
    }>('SELECT id, balance, interest_enabled, interest_rate, interest_type FROM customers WHERE balance != 0');

    for (const c of existing) {
      await db.runAsync(
        'INSERT INTO lends (customer_id, amount, interest_enabled, interest_rate, interest_type) VALUES (?, ?, ?, ?, ?)',
        [c.id, c.balance, c.interest_enabled, c.interest_rate, c.interest_type]
      );
    }

    currentDbVersion = 3;
  }

  if (currentDbVersion < 4) {
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(lends)');
    const columnNames = new Set(columns.map((col) => col.name));

    if (!columnNames.has('description')) {
      await db.execAsync('ALTER TABLE lends ADD COLUMN description TEXT DEFAULT NULL;');
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

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
