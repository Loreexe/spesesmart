// db.js
let db = null;
const DB_NAME = "SpeseSmartDB";
const STORE_NAME = "sqlite";
const FILE_KEY = "db_file";
let localFileHandle = null;

export async function initDatabase() {
    console.log("Initializing database...");
    const SQL = await initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
    });
    
    // Check IndexedDB
    const savedData = await loadFromIndexedDB();
    if (savedData) {
        console.log("Loaded existing database from IndexedDB.");
        db = new SQL.Database(savedData);
        createTables(); // Ensure all tables exist
        migrateSchema(); // Ensure all columns exist
        await processRecurringTransactions();
    } else {
        console.log("Creating new database.");
        db = new SQL.Database();
        createTables();
        
        await processRecurringTransactions();
        await saveDB();
    }
}

function createTables() {
    db.run(`
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            balance REAL DEFAULT 0,
            goal_amount REAL DEFAULT NULL,
            goal_deadline TEXT DEFAULT NULL,
            color TEXT DEFAULT '#1c6d25',
            icon TEXT DEFAULT 'wallet',
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        );
        
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            description TEXT NOT NULL,
            tag TEXT NOT NULL,
            account_id INTEGER NOT NULL REFERENCES accounts(id),
            amount REAL NOT NULL,
            type TEXT NOT NULL,
            notes TEXT DEFAULT '',
            receipt_image TEXT DEFAULT NULL,
            is_imported INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        );
        
        CREATE TABLE IF NOT EXISTS monthly_budgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            year INTEGER NOT NULL,
            month INTEGER NOT NULL,
            budget_amount REAL NOT NULL,
            carried_over_from_previous REAL DEFAULT 0,
            UNIQUE(year, month)
        );
        
        CREATE TABLE IF NOT EXISTS budgets (
            tag TEXT PRIMARY KEY,
            amount REAL NOT NULL,
            period TEXT DEFAULT 'monthly'
        );

        CREATE TABLE IF NOT EXISTS recurring_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            type TEXT NOT NULL,
            frequency TEXT NOT NULL,
            next_date TEXT NOT NULL,
            account_id INTEGER NOT NULL,
            to_account_id INTEGER,
            tag TEXT DEFAULT 'Ricorrente'
        );
        
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            color TEXT DEFAULT '#9b9e97',
            icon TEXT DEFAULT 'label'
        );
    `);
}

function migrateSchema() {
    // ALTER TABLE in SQLite to add columns if they don't exist
    try {
        db.run("ALTER TABLE accounts ADD COLUMN goal_amount REAL DEFAULT NULL");
    } catch (e) { /* column likely exists */ }
    
    try {
        db.run("ALTER TABLE accounts ADD COLUMN goal_deadline TEXT DEFAULT NULL");
    } catch (e) { /* column likely exists */ }
    
    try {
        db.run("ALTER TABLE transactions ADD COLUMN is_imported INTEGER DEFAULT 0");
    } catch (e) { /* column likely exists */ }
    
    // Add recurring_transactions table if it missed createTables for some reason
    // (though createTables should have handled it)
}

function loadFromIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        
        request.onupgradeneeded = (e) => {
            const dbRef = e.target.result;
            if (!dbRef.objectStoreNames.contains(STORE_NAME)) {
                dbRef.createObjectStore(STORE_NAME);
            }
        };
        
        request.onsuccess = (e) => {
            const dbRef = e.target.result;
            if (!dbRef.objectStoreNames.contains(STORE_NAME)) {
                resolve(null);
                return;
            }
            const tx = dbRef.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const getReq = store.get(FILE_KEY);
            getReq.onsuccess = () => resolve(getReq.result);
            getReq.onerror = () => resolve(null);
        };
        request.onerror = () => reject(request.error);
    });
}

export async function setLocalFileHandle(handle) {
    localFileHandle = handle;
    const options = { mode: 'readwrite' };
    if ((await handle.queryPermission(options)) !== 'granted') {
        if ((await handle.requestPermission(options)) !== 'granted') {
            throw new Error('Permesso negato per il file locale.');
        }
    }
}

export async function saveDB() {
    if (!db) return;
    const data = db.export();

    // 1. Save to IndexedDB
    const idbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onsuccess = (e) => {
            const dbRef = e.target.result;
            const tx = dbRef.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const putReq = store.put(data, FILE_KEY);
            putReq.onsuccess = () => resolve();
            putReq.onerror = () => reject(putReq.error);
        };
        request.onerror = () => reject(request.error);
    });

    // 2. Save to Local File if connected
    if (localFileHandle) {
        try {
            const writable = await localFileHandle.createWritable();
            await writable.write(data);
            await writable.close();
            console.log("Database salvato su file locale.");
        } catch (e) {
            console.error("Errore salvataggio file locale:", e);
        }
    }

    return idbPromise;
}

// ---------------------------------------------------------
// Helper for returning array of objects
// ---------------------------------------------------------
function execQuery(sql, params = []) {
    const stmt = db.prepare(sql);
    if (params.length > 0) {
        stmt.bind(params);
    }
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

// ---------------------------------------------------------
// Accounts CRUD
// ---------------------------------------------------------
export function getAccounts() {
    return execQuery("SELECT * FROM accounts ORDER BY id ASC");
}

export function getAccountById(id) {
    const res = execQuery("SELECT * FROM accounts WHERE id = ?", [id]);
    return res.length ? res[0] : null;
}

export function addAccount(acc) {
    db.run("INSERT INTO accounts (name, type, balance, color, icon, goal_amount) VALUES (?, ?, ?, ?, ?, ?)", 
        [acc.name, acc.type || 'account', acc.balance || 0, acc.color || '#4caf50', acc.icon || 'account_balance', acc.goal_amount || null]);
    return saveDB();
}

export async function updateAccountBalance(id, newBalance) {
    db.run("UPDATE accounts SET balance = ? WHERE id = ?", [newBalance, id]);
    await saveDB();
}

export async function updateAccount(id, data) {
    db.run("UPDATE accounts SET name = ?, type = ?, goal_amount = ? WHERE id = ?", 
        [data.name, data.type, data.goal_amount, id]);
    await saveDB();
}

export async function deleteAccount(id) {
    // Also delete transactions for this account
    db.run("DELETE FROM transactions WHERE account_id = ?", [id]);
    db.run("DELETE FROM accounts WHERE id = ?", [id]);
    await saveDB();
}

// ---------------------------------------------------------
// Transactions CRUD
// ---------------------------------------------------------
export function getTransactions(filters = {}) {
    let sql = "SELECT t.*, a.name as account_name FROM transactions t JOIN accounts a ON t.account_id = a.id";
    let params = [];
    let conditions = [];

    if (filters.type && filters.type !== 'all') {
        conditions.push("t.type = ?");
        params.push(filters.type);
    }
    if (filters.accountId) {
        conditions.push("t.account_id = ?");
        params.push(filters.accountId);
    }
    if (filters.dateFrom) {
        conditions.push("t.date >= ?");
        params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
        conditions.push("t.date <= ?");
        params.push(filters.dateTo);
    }
    if (filters.tag && filters.tag !== 'Tutte') {
        conditions.push("t.tag = ?");
        params.push(filters.tag);
    }

    if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
    }
    
    // Let SQL do basic sort, but we enforce strict JS date parsing to handle potentially malformed CSV dates
    const sortBy = filters.sortBy || "date";
    const sortOrder = filters.sortOrder || "DESC";
    sql += ` ORDER BY t.${sortBy} ${sortOrder}, t.id DESC`;

    let results = execQuery(sql, params);
    
    // Strict chronological sort
    results.sort((a, b) => {
        const parseDate = (dStr) => {
            if (!dStr) return 0;
            if (dStr.includes('/')) {
                const p = dStr.split('/');
                if (p.length === 3 && p[2].length === 4) return new Date(`${p[2]}-${p[1]}-${p[0]}`).getTime();
            }
            return new Date(dStr).getTime();
        };
        const timeA = parseDate(a.date);
        const timeB = parseDate(b.date);
        if (timeA === timeB) return b.id - a.id;
        return sortOrder === 'ASC' ? timeA - timeB : timeB - timeA;
    });
    
    return results;
}

export async function addTransaction(t) {
    // start transaction logic manually since we are managing account balance
    db.run(
        "INSERT INTO transactions (date, description, tag, account_id, amount, type, notes, receipt_image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [t.date, t.description, t.tag, t.account_id, t.amount, t.type, t.notes || '', t.receipt_image || null]
    );

    // Auto-update account balance
    const acc = getAccountById(t.account_id);
    if (acc) {
        const diff = t.type === 'income' ? t.amount : -t.amount;
        await updateAccountBalance(t.account_id, acc.balance + diff);
    } else {
        await saveDB();
    }
}

export async function deleteTransaction(id) {
    const res = execQuery("SELECT * FROM transactions WHERE id = ?", [id]);
    if (!res.length) return;
    const t = res[0];

    db.run("DELETE FROM transactions WHERE id = ?", [id]);

    // Reverse account balance update
    const acc = getAccountById(t.account_id);
    if (acc) {
        const diff = t.type === 'income' ? -t.amount : t.amount;
        await updateAccountBalance(t.account_id, acc.balance + diff);
    } else {
        await saveDB();
    }
}

export async function updateTransaction(id, t) {
    const res = execQuery("SELECT * FROM transactions WHERE id = ?", [id]);
    if (!res.length) return;
    const oldTx = res[0];

    db.run(
        "UPDATE transactions SET date = ?, description = ?, tag = ?, account_id = ?, amount = ?, type = ?, notes = ?, receipt_image = ? WHERE id = ?",
        [t.date, t.description, t.tag, t.account_id, t.amount, t.type, t.notes || '', t.receipt_image || oldTx.receipt_image, id]
    );

    // Reconcile balance
    // Revert old transaction
    const oldAcc = getAccountById(oldTx.account_id);
    if (oldAcc) {
        const diff = oldTx.type === 'income' ? -oldTx.amount : oldTx.amount;
        await updateAccountBalance(oldTx.account_id, oldAcc.balance + diff);
    }

    // Apply new transaction
    const newAcc = getAccountById(t.account_id);
    if (newAcc) {
        const diff = t.type === 'income' ? t.amount : -t.amount;
        await updateAccountBalance(t.account_id, newAcc.balance + diff);
    } else {
        await saveDB();
    }
}

// ---------------------------------------------------------
// Tags & Budgets
// ---------------------------------------------------------
export function getTags() {
    return execQuery("SELECT * FROM tags ORDER BY name ASC");
}

export async function addTag(name, color = '#9b9e97', icon = 'label') {
    db.run("INSERT OR IGNORE INTO tags (name, color, icon) VALUES (?, ?, ?)", [name, color, icon]);
    await saveDB();
}

export function getBudget(year, month) {
    const res = execQuery("SELECT * FROM monthly_budgets WHERE year = ? AND month = ?", [year, month]);
    return res.length ? res[0] : null;
}

export async function setBudget(year, month, amount, carriedOver = 0) {
    db.run(
        "INSERT INTO monthly_budgets (year, month, budget_amount, carried_over_from_previous) VALUES (?, ?, ?, ?) ON CONFLICT(year, month) DO UPDATE SET budget_amount=excluded.budget_amount, carried_over_from_previous=excluded.carried_over_from_previous",
        [year, month, amount, carriedOver]
    );
    await saveDB();
}

// ---------------------------------------------------------
// Recurring Transactions Logic
// ---------------------------------------------------------
export async function addRecurringTransaction(rtx) {
    db.run(`INSERT INTO recurring_transactions (description, amount, type, frequency, next_date, account_id, to_account_id, tag)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [rtx.description, rtx.amount, rtx.type, rtx.frequency, rtx.next_date, rtx.account_id, rtx.to_account_id || null, rtx.tag || 'Ricorrente']);
    return saveDB();
}

export function getRecurringTransactions() {
    return execQuery("SELECT * FROM recurring_transactions");
}

export async function processRecurringTransactions() {
    const now = new Date().toISOString().split('T')[0];
    const pending = execQuery("SELECT * FROM recurring_transactions WHERE next_date <= ?", [now]);

    if (pending.length === 0) return;

    for (const rtx of pending) {
        // 1. Create the actual transaction
        addTransaction({
            date: rtx.next_date,
            description: rtx.description,
            amount: rtx.amount,
            type: rtx.type,
            account_id: rtx.account_id,
            tag: rtx.tag,
            notes: 'Automatica'
        });

        // 2. If it's a transfer to a savings fund, update the fund balance too
        if (rtx.type === 'transfer' && rtx.to_account_id) {
            addTransaction({
                date: rtx.next_date,
                description: `Ricevuto da ${rtx.description}`,
                amount: rtx.amount,
                type: 'income',
                account_id: rtx.to_account_id,
                tag: 'Risparmio',
                notes: 'Trasferimento automatico'
            });
        }

        // 3. Update next_date
        const next = new Date(rtx.next_date);
        if (rtx.frequency === 'monthly') next.setMonth(next.getMonth() + 1);
        else if (rtx.frequency === 'weekly') next.setDate(next.getDate() + 7);
        else if (rtx.frequency === 'daily') next.setDate(next.getDate() + 1);
        
        const nextStr = next.toISOString().split('T')[0];
        db.run("UPDATE recurring_transactions SET next_date = ? WHERE id = ?", [nextStr, rtx.id]);
    }

    await saveDB();
    console.log(`Processed ${pending.length} recurring transactions.`);
}

export async function importFromCSV(csvText) {
    const lines = csvText.split('\n').filter(l => l.trim() !== '');
    if (lines.length < 2) return;

    for (let i = 1; i < lines.length; i++) {
        // Basic parser handling quotes
        const parts = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!parts || parts.length < 6) continue;
        
        const clean = parts.map(s => s.trim().replace(/^"|"$/g, ''));
        const [date, desc, tag, accName, amount, type, notes] = clean;
        
        let acc = execQuery("SELECT * FROM accounts WHERE name = ?", [accName])[0];
        if (!acc) {
            db.run("INSERT INTO accounts (name, type, balance, color, icon) VALUES (?, 'account', 0, '#1c6d25', 'account_balance')", [accName]);
            acc = execQuery("SELECT * FROM accounts WHERE name = ?", [accName])[0];
        }

        db.run(
            "INSERT INTO transactions (date, description, tag, account_id, amount, type, notes, is_imported) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
            [date, desc, tag, acc.id, parseFloat(amount), type, notes || '']
        );
    }

    // Recalculate balances
    db.run("UPDATE accounts SET balance = 0");
    db.run(`
        UPDATE accounts SET balance = (
            SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE -amount END), 0)
            FROM transactions
            WHERE account_id = accounts.id
        )
    `);

    await saveDB();
}

export async function resetDatabase() {
    db = new SQL.Database();
    createTables();
    await saveDB();
}

export function exportDatabase() {
    return db.export(); 
}

