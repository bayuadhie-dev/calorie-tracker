import * as SQLite from 'expo-sqlite';
import { getOrCreateEncryptionKey } from '../utils/secureKey';

const DB_NAME = 'calorie_tracker.db';

// TOGGLE ENCRYPTION FOR PRODUCTION (SQLCipher). Keep false for Expo Go testing.
export const USE_ENCRYPTION = false;

let dbInstance: SQLite.SQLiteDatabase | null = null;
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

class TxMutex {
  private queue: Promise<any> = Promise.resolve();

  async acquire(): Promise<() => void> {
    let release: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const current = this.queue;
    this.queue = current.then(() => next).catch(() => next);
    await current;
    return release!;
  }
}

const txMutex = new TxMutex();

// DDL Schema Statements (Version 2 Complete)
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    weight_kg REAL NOT NULL,
    target_weight_kg REAL,
    start_weight_kg REAL,
    height_cm REAL NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male','female')),
    goal TEXT NOT NULL CHECK (goal IN ('diet','maintenance','surplus')),
    activity_level TEXT NOT NULL CHECK (activity_level IN ('sedentary','light','moderate','active','very_active')),
    bmr REAL,
    tdee REAL,
    target_calorie REAL,
    target_carb_g REAL,
    target_protein_g REAL,
    target_fat_g REAL,
    target_water_ml REAL,
    weigh_in_interval_days INTEGER DEFAULT 7,
    last_weigh_in_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS food_restriction_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    type TEXT DEFAULT 'restriction' CHECK (type IN ('restriction', 'preference'))
);

CREATE TABLE IF NOT EXISTS user_food_restrictions (
    user_id INTEGER NOT NULL DEFAULT 1,
    tag_id INTEGER NOT NULL REFERENCES food_restriction_tags(id),
    PRIMARY KEY (user_id, tag_id)
);

CREATE TABLE IF NOT EXISTS user_food_preferences (
    user_id INTEGER NOT NULL DEFAULT 1,
    tag_id INTEGER NOT NULL REFERENCES food_restriction_tags(id),
    PRIMARY KEY (user_id, tag_id)
);

CREATE TABLE IF NOT EXISTS food_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    calorie_per_100g REAL NOT NULL,
    carb_g REAL NOT NULL,
    protein_g REAL NOT NULL,
    fat_g REAL NOT NULL,
    default_serving_g REAL DEFAULT 100,
    source TEXT DEFAULT 'tkpi',
    is_custom INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS food_portion_units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    food_item_id INTEGER NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
    unit_label TEXT NOT NULL,
    grams_equivalent REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS food_item_tags (
    food_item_id INTEGER NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES food_restriction_tags(id),
    PRIMARY KEY (food_item_id, tag_id)
);

CREATE TABLE IF NOT EXISTS food_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    food_item_id INTEGER REFERENCES food_items(id),
    log_date TEXT NOT NULL,
    meal_type TEXT CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
    serving_g REAL NOT NULL,
    calorie REAL NOT NULL,
    carb_g REAL NOT NULL,
    protein_g REAL NOT NULL,
    fat_g REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS water_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_date TEXT NOT NULL,
    amount_ml INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activity_checklist_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    applicable_goal TEXT
);

CREATE TABLE IF NOT EXISTS activity_checklist_daily (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER REFERENCES activity_checklist_templates(id),
    log_date TEXT NOT NULL,
    is_done INTEGER DEFAULT 0,
    done_at TEXT
);

CREATE TABLE IF NOT EXISTS daily_history (
    log_date TEXT PRIMARY KEY,
    total_calorie REAL,
    total_carb_g REAL,
    total_protein_g REAL,
    total_fat_g REAL,
    total_water_ml REAL,
    target_calorie REAL,
    activity_completed_count INTEGER,
    activity_total_count INTEGER,
    locked_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS weight_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_date TEXT NOT NULL,
    weight_kg REAL NOT NULL,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS achievement_definitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('weight','streak','hydration','consistency'))
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    achievement_code TEXT NOT NULL REFERENCES achievement_definitions(code),
    unlocked_at TEXT DEFAULT (datetime('now')),
    value_at_unlock REAL
);

CREATE TABLE IF NOT EXISTS daily_notes (
    log_date TEXT PRIMARY KEY,
    mood TEXT CHECK (mood IN ('great','good','neutral','bad','terrible')),
    note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    value TEXT
);

CREATE INDEX IF NOT EXISTS idx_food_logs_date ON food_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_water_logs_date ON water_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_activity_daily_date ON activity_checklist_daily(log_date);
CREATE INDEX IF NOT EXISTS idx_food_items_custom ON food_items(is_custom);
CREATE INDEX IF NOT EXISTS idx_food_items_name ON food_items(name);
CREATE INDEX IF NOT EXISTS idx_weight_logs_date ON weight_logs(log_date);
`;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = (async () => {
    const db = await SQLite.openDatabaseAsync(DB_NAME);

    if (USE_ENCRYPTION) {
      const key = await getOrCreateEncryptionKey();
      await db.execAsync(`PRAGMA key = '${key}';`);
    }

    const originalWithTransaction = db.withTransactionAsync.bind(db);
    db.withTransactionAsync = async (task: () => Promise<void>) => {
      const release = await txMutex.acquire();
      try {
        await originalWithTransaction(task);
      } finally {
        release();
      }
    };

    dbInstance = db;
    return db;
  })();

  return dbPromise;
}

export async function initDb(): Promise<void> {
  const db = await getDb();

  // 1. Initialize Tables (for fresh install)
  await db.execAsync(SCHEMA_SQL);

  // 2. Database Schema Migration (for existing installs upgrading to v2)
  const versionResult = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const userVersion = versionResult?.user_version ?? 0;

  if (userVersion < 2) {
    console.log(`Upgrading database schema from version ${userVersion} to 2...`);

    const migrations = [
      `ALTER TABLE food_restriction_tags ADD COLUMN type TEXT DEFAULT 'restriction' CHECK (type IN ('restriction', 'preference'))`,
      `CREATE TABLE IF NOT EXISTS user_food_preferences (
          user_id INTEGER NOT NULL DEFAULT 1,
          tag_id INTEGER NOT NULL REFERENCES food_restriction_tags(id),
          PRIMARY KEY (user_id, tag_id)
      )`,
      `ALTER TABLE user_profile ADD COLUMN target_weight_kg REAL`,
      `ALTER TABLE user_profile ADD COLUMN start_weight_kg REAL`,
      `ALTER TABLE user_profile ADD COLUMN weigh_in_interval_days INTEGER DEFAULT 7`,
      `ALTER TABLE user_profile ADD COLUMN last_weigh_in_date TEXT`,
      `CREATE TABLE IF NOT EXISTS weight_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          log_date TEXT NOT NULL,
          weight_kg REAL NOT NULL,
          note TEXT,
          created_at TEXT DEFAULT (datetime('now'))
      )`,
      `CREATE INDEX IF NOT EXISTS idx_weight_logs_date ON weight_logs(log_date)`,
      `CREATE TABLE IF NOT EXISTS achievement_definitions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT UNIQUE NOT NULL,
          label TEXT NOT NULL,
          description TEXT NOT NULL,
          category TEXT NOT NULL CHECK (category IN ('weight','streak','hydration','consistency'))
      )`,
      `CREATE TABLE IF NOT EXISTS user_achievements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          achievement_code TEXT NOT NULL REFERENCES achievement_definitions(code),
          unlocked_at TEXT DEFAULT (datetime('now')),
          value_at_unlock REAL
      )`,
      `CREATE TABLE IF NOT EXISTS daily_notes (
          log_date TEXT PRIMARY KEY,
          mood TEXT CHECK (mood IN ('great','good','neutral','bad','terrible')),
          note TEXT,
          created_at TEXT DEFAULT (datetime('now'))
      )`
    ];

    for (const sql of migrations) {
      try {
        await db.runAsync(sql);
      } catch (err: any) {
        const msg = err?.message ?? '';
        if (msg.includes('duplicate column name') || msg.includes('already exists') || msg.includes('duplicate column')) {
          console.log(`Migration statement skipped (column/table already exists): ${sql.substring(0, 40)}...`);
        } else {
          console.warn(`Migration statement warning: ${msg} for query: ${sql}`);
        }
      }
    }

    await db.execAsync('PRAGMA user_version = 2;');
    console.log('Database schema successfully upgraded to version 2.');
  }

  // 3. Check and Seed/Update Restriction & Preference Tags
  const tags = [
    // Restrictions (V1)
    { code: 'no-beef', label: 'Tidak makan sapi', type: 'restriction' },
    { code: 'no-pork', label: 'Tidak makan babi', type: 'restriction' },
    { code: 'no-seafood', label: 'Alergi seafood', type: 'restriction' },
    { code: 'no-nuts', label: 'Alergi kacang', type: 'restriction' },
    { code: 'no-dairy', label: 'Intoleransi laktosa (susu)', type: 'restriction' },
    { code: 'vegan', label: 'Vegan', type: 'restriction' },
    { code: 'vegetarian', label: 'Vegetarian', type: 'restriction' },
    // Restrictions (V2)
    { code: 'NO_VEGETABLE', label: 'Tidak suka sayur', type: 'restriction' },
    { code: 'NO_FRUIT', label: 'Tidak suka buah', type: 'restriction' },
    { code: 'ALLERGY_SEAFOOD', label: 'Alergi seafood (v2)', type: 'restriction' },
    { code: 'ALLERGY_PEANUT', label: 'Alergi kacang (v2)', type: 'restriction' },
    { code: 'ALLERGY_LACTOSE', label: 'Alergi susu/laktosa (v2)', type: 'restriction' },
    // Preferences (V2)
    { code: 'PREF_CHICKEN', label: 'Suka ayam', type: 'preference' },
    { code: 'PREF_EGG', label: 'Suka telur', type: 'preference' },
    { code: 'PREF_TOFU_TEMPE', label: 'Suka tahu/tempe', type: 'preference' },
    { code: 'PREF_BEEF', label: 'Suka daging sapi', type: 'preference' },
    { code: 'PREF_SEAFOOD', label: 'Suka seafood', type: 'preference' },
    { code: 'PREF_VEGETABLE', label: 'Suka sayur', type: 'preference' },
    { code: 'PREF_FRUIT', label: 'Suka buah', type: 'preference' },
    { code: 'PREF_RICE', label: 'Suka nasi', type: 'preference' },
    { code: 'PREF_NOODLE', label: 'Suka mie/pasta', type: 'preference' },
  ];

  await db.withTransactionAsync(async () => {
    for (const t of tags) {
      const existing = await db.getFirstAsync<{ id: number }>('SELECT id FROM food_restriction_tags WHERE code = ?', t.code);
      if (!existing) {
        await db.runAsync(
          'INSERT INTO food_restriction_tags (code, label, type) VALUES (?, ?, ?)',
          t.code,
          t.label,
          t.type
        );
      } else {
        // Ensure type is updated for existing tags
        await db.runAsync(
          'UPDATE food_restriction_tags SET type = ? WHERE code = ?',
          t.type,
          t.code
        );
      }
    }
  });

  // 4. Check and Seed Activity Checklist Templates
  const templatesCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM activity_checklist_templates');
  if (templatesCount && templatesCount.count === 0) {
    console.log('Seeding activity checklist templates...');
    await db.withTransactionAsync(async () => {
      const templates = [
        { label: 'Minum air minimal sesuai target', applicable_goal: null },
        { label: 'Jaga asupan kalori di bawah target harian', applicable_goal: null },
        { label: 'Catat makanan sarapan pagi', applicable_goal: null },
        { label: 'Catat makanan makan siang', applicable_goal: null },
        { label: 'Catat makanan makan malam', applicable_goal: null },
        { label: 'Makan sayur/buah hari ini', applicable_goal: null },
        { label: 'Lakukan aktivitas olahraga ringan 15 menit', applicable_goal: 'diet' },
        { label: 'Lakukan olahraga angkat beban/pengencangan otot', applicable_goal: 'surplus' },
      ];
      for (const temp of templates) {
        await db.runAsync(
          'INSERT INTO activity_checklist_templates (label, applicable_goal) VALUES (?, ?)',
          temp.label,
          temp.applicable_goal
        );
      }
    });
  }

  // 5. Check and Seed Food Items (TKPI dataset)
  const foodsCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM food_items WHERE source = "tkpi"');
  if (foodsCount && foodsCount.count === 0) {
    console.log('Seeding food items from TKPI dataset (1346 items)... This may take a few seconds.');
    const seedData = require('./seed/food_items_tkpi.json');

    const dbTags = await db.getAllAsync<{ id: number; code: string }>('SELECT id, code FROM food_restriction_tags');
    const tagMap = new Map<string, number>();
    dbTags.forEach((t) => tagMap.set(t.code, t.id));

    await db.withTransactionAsync(async () => {
      for (const item of seedData) {
        const result = await db.runAsync(
          `INSERT INTO food_items (name, calorie_per_100g, carb_g, protein_g, fat_g, default_serving_g, source, is_custom)
           VALUES (?, ?, ?, ?, ?, 100.0, 'tkpi', 0)`,
          item.name,
          item.calorie_per_100g,
          item.carb_g,
          item.protein_g,
          item.fat_g
        );
        const foodId = result.lastInsertRowId;

        if (item.portions && item.portions.length > 0) {
          for (const port of item.portions) {
            await db.runAsync(
              'INSERT OR IGNORE INTO food_portion_units (food_item_id, unit_label, grams_equivalent) VALUES (?, ?, ?)',
              foodId,
              port.unit_label,
              port.grams_equivalent
            );
          }
        }

        if (item.tags && item.tags.length > 0) {
          for (const tagCode of item.tags) {
            const tagId = tagMap.get(tagCode);
            if (tagId !== undefined) {
              await db.runAsync(
                'INSERT OR IGNORE INTO food_item_tags (food_item_id, tag_id) VALUES (?, ?)',
                foodId,
                tagId
              );
            }
          }
        }
      }
    });
    console.log('Food database seeded successfully.');
  }

  // 6. Check and Seed Local Supplement Food Items (V2)
  const localFoodsCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM food_items WHERE source = "local"');
  if (localFoodsCount && localFoodsCount.count === 0) {
    console.log('Seeding local supplementary food items...');
    const localSeedData = require('./seed/food_items_local.json');
    const dbTags = await db.getAllAsync<{ id: number; code: string }>('SELECT id, code FROM food_restriction_tags');
    const tagMap = new Map<string, number>();
    dbTags.forEach((t) => tagMap.set(t.code, t.id));

    await db.withTransactionAsync(async () => {
      for (const item of localSeedData) {
        const result = await db.runAsync(
          `INSERT INTO food_items (name, calorie_per_100g, carb_g, protein_g, fat_g, default_serving_g, source, is_custom)
           VALUES (?, ?, ?, ?, ?, ?, 'local', 0)`,
          item.name,
          item.calorie_per_100g,
          item.carb_g,
          item.protein_g,
          item.fat_g,
          item.default_serving_g
        );
        const foodId = result.lastInsertRowId;

        if (item.portions && item.portions.length > 0) {
          for (const port of item.portions) {
            await db.runAsync(
              'INSERT OR IGNORE INTO food_portion_units (food_item_id, unit_label, grams_equivalent) VALUES (?, ?, ?)',
              foodId,
              port.unit_label,
              port.grams_equivalent
            );
          }
        }

        if (item.tags && item.tags.length > 0) {
          for (const tagCode of item.tags) {
            const tagId = tagMap.get(tagCode);
            if (tagId !== undefined) {
              await db.runAsync(
                'INSERT OR IGNORE INTO food_item_tags (food_item_id, tag_id) VALUES (?, ?)',
                foodId,
                tagId
              );
            }
          }
        }
      }
    });
    console.log('Local supplementary food items seeded successfully.');
  }

  // 7. Check and Seed Achievement Definitions (V2)
  const achievementsCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM achievement_definitions');
  if (achievementsCount && achievementsCount.count === 0) {
    console.log('Seeding achievement definitions...');
    await db.withTransactionAsync(async () => {
      const achievements = [
        { code: 'WEIGHT_MINUS_1', label: 'Turun 1 Kg!', description: 'Berhasil menurunkan BB 1 kg dari berat awal', category: 'weight' },
        { code: 'WEIGHT_MINUS_3', label: 'Turun 3 Kg!', description: 'Berhasil menurunkan BB 3 kg dari berat awal', category: 'weight' },
        { code: 'WEIGHT_MINUS_5', label: 'Turun 5 Kg!', description: 'Berhasil menurunkan BB 5 kg dari berat awal', category: 'weight' },
        { code: 'WEIGHT_MINUS_10', label: 'Turun 10 Kg!', description: 'Berhasil menurunkan BB 10 kg dari berat awal', category: 'weight' },
        { code: 'WEIGHT_GOAL_REACHED', label: 'Target Tercapai!', description: 'Berat badan aktual sudah mencapai target', category: 'weight' },
        { code: 'WEIGHT_PLUS_1', label: 'Naik 1 Kg!', description: 'Berhasil menaikkan BB 1 kg dari berat awal', category: 'weight' },
        { code: 'WEIGHT_PLUS_3', label: 'Naik 3 Kg!', description: 'Berhasil menaikkan BB 3 kg dari berat awal', category: 'weight' },
        { code: 'WEIGHT_PLUS_5', label: 'Naik 5 Kg!', description: 'Berhasil menaikkan BB 5 kg dari berat awal', category: 'weight' },
        { code: 'STREAK_LOG_3', label: '3 Hari Konsisten', description: 'Log makanan 3 hari berturut-turut', category: 'streak' },
        { code: 'STREAK_LOG_7', label: 'Seminggu Penuh!', description: 'Log makanan 7 hari berturut-turut', category: 'streak' },
        { code: 'STREAK_LOG_14', label: '2 Minggu Kuat!', description: 'Log makanan 14 hari berturut-turut', category: 'streak' },
        { code: 'STREAK_LOG_30', label: '30 Hari Champion!', description: 'Log makanan 30 hari berturut-turut', category: 'streak' },
        { code: 'STREAK_WATER_3', label: 'Terhidrasi 3 Hari', description: 'Target air tercapai 3 hari berturut-turut', category: 'hydration' },
        { code: 'STREAK_WATER_7', label: 'Hydration Hero', description: 'Target air tercapai 7 hari berturut-turut', category: 'hydration' },
        { code: 'WEIGHIN_FIRST', label: 'Mulai Timbang', description: 'Pertama kali mencatat berat badan', category: 'consistency' },
        { code: 'WEIGHIN_3X', label: 'Rajin Timbang', description: 'Menimbang badan tepat waktu 3 kali berturut-turut', category: 'consistency' },
        { code: 'WEIGHIN_5X', label: 'Disiplin Total', description: 'Menimbang badan tepat waktu 5 kali berturut-turut', category: 'consistency' },
      ];
      for (const ach of achievements) {
        await db.runAsync(
          'INSERT OR IGNORE INTO achievement_definitions (code, label, description, category) VALUES (?, ?, ?, ?)',
          ach.code,
          ach.label,
          ach.description,
          ach.category
        );
      }
    });
  }
}
