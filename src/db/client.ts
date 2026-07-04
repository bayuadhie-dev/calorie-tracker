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

// DDL Schema Statements
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    weight_kg REAL NOT NULL,
    target_weight_kg REAL,
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
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS food_restriction_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_food_restrictions (
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

CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    value TEXT
);

CREATE INDEX IF NOT EXISTS idx_food_logs_date ON food_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_water_logs_date ON water_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_activity_daily_date ON activity_checklist_daily(log_date);
CREATE INDEX IF NOT EXISTS idx_food_items_custom ON food_items(is_custom);
CREATE INDEX IF NOT EXISTS idx_food_items_name ON food_items(name);
`;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = (async () => {
    // In modern expo-sqlite, we open database asynchronously
    const db = await SQLite.openDatabaseAsync(DB_NAME);

    if (USE_ENCRYPTION) {
      const key = await getOrCreateEncryptionKey();
      // Run PRAGMA key as the first statement for SQLCipher
      await db.execAsync(`PRAGMA key = '${key}';`);
    }

    // Wrap withTransactionAsync to serialize transactions and prevent race conditions
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

  // 1. Initialize Tables
  await db.execAsync(SCHEMA_SQL);

  // 2. Check and Seed Restriction Tags
  const tagsCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM food_restriction_tags');
  if (tagsCount && tagsCount.count === 0) {
    console.log('Seeding food restriction tags...');
    await db.withTransactionAsync(async () => {
      const tags = [
        { code: 'no-beef', label: 'Tidak makan sapi' },
        { code: 'no-pork', label: 'Tidak makan babi' },
        { code: 'no-seafood', label: 'Alergi seafood' },
        { code: 'no-nuts', label: 'Alergi kacang' },
        { code: 'no-dairy', label: 'Intoleransi laktosa (susu)' },
        { code: 'vegan', label: 'Vegan' },
        { code: 'vegetarian', label: 'Vegetarian' },
      ];
      for (const t of tags) {
        await db.runAsync(
          'INSERT INTO food_restriction_tags (code, label) VALUES (?, ?)',
          t.code,
          t.label
        );
      }
    });
  }

  // 3. Check and Seed Activity Checklist Templates
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

  // 4. Check and Seed Food Items (TKPI dataset)
  const foodsCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM food_items');
  if (foodsCount && foodsCount.count === 0) {
    console.log('Seeding food items from TKPI dataset (1346 items)... This may take a few seconds.');
    
    // Load local json seed file
    // In React Native/Expo, we can require the json directly
    const seedData = require('./seed/food_items_tkpi.json');

    // Retrieve tag list from DB to map code to ID
    const dbTags = await db.getAllAsync<{ id: number; code: string }>('SELECT id, code FROM food_restriction_tags');
    const tagMap = new Map<string, number>();
    dbTags.forEach((t) => tagMap.set(t.code, t.id));

    // Batch insert items in a single transaction for maximum speed
    await db.withTransactionAsync(async () => {
      for (const item of seedData) {
        // Insert food_item
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

        // Insert portion units
        if (item.portions && item.portions.length > 0) {
          for (const port of item.portions) {
            await db.runAsync(
              'INSERT INTO food_portion_units (food_item_id, unit_label, grams_equivalent) VALUES (?, ?, ?)',
              foodId,
              port.unit_label,
              port.grams_equivalent
            );
          }
        }

        // Insert food item tags
        if (item.tags && item.tags.length > 0) {
          for (const tagCode of item.tags) {
            const tagId = tagMap.get(tagCode);
            if (tagId !== undefined) {
              await db.runAsync(
                'INSERT INTO food_item_tags (food_item_id, tag_id) VALUES (?, ?)',
                foodId,
                tagId
              );
            }
          }
        }
      }

      // Seed popular Indonesian snacks (Jajanan)
      console.log('Seeding supplementary Indonesian snacks/jajanan...');
      for (const item of JAJANAN_SEED) {
        const result = await db.runAsync(
          `INSERT INTO food_items (name, calorie_per_100g, carb_g, protein_g, fat_g, default_serving_g, source, is_custom)
           VALUES (?, ?, ?, ?, ?, 100.0, 'jajanan', 0)`,
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
              'INSERT INTO food_portion_units (food_item_id, unit_label, grams_equivalent) VALUES (?, ?, ?)',
              foodId,
              port.unit_label,
              port.grams_equivalent
            );
          }
        }
      }
    });
    console.log('Food database seeded successfully.');
  }
}

const JAJANAN_SEED = [
  {
    name: 'Martabak Manis (Terang Bulan) Cokelat Keju',
    calorie_per_100g: 340,
    carb_g: 50,
    protein_g: 7,
    fat_g: 12,
    portions: [
      { unit_label: 'piring (4 potong)', grams_equivalent: 320 },
      { unit_label: 'potong', grams_equivalent: 80 }
    ]
  },
  {
    name: 'Martabak Telur Spesial',
    calorie_per_100g: 250,
    carb_g: 18,
    protein_g: 11,
    fat_g: 15,
    portions: [
      { unit_label: 'potong', grams_equivalent: 60 },
      { unit_label: 'porsi (4 potong)', grams_equivalent: 240 }
    ]
  },
  {
    name: 'Batagor Bumbu Kacang',
    calorie_per_100g: 290,
    carb_g: 28,
    protein_g: 8,
    fat_g: 16,
    portions: [
      { unit_label: 'biji', grams_equivalent: 30 },
      { unit_label: 'porsi (5 biji)', grams_equivalent: 150 }
    ]
  },
  {
    name: 'Siomay Bandung Bumbu Kacang',
    calorie_per_100g: 160,
    carb_g: 15,
    protein_g: 10,
    fat_g: 6,
    portions: [
      { unit_label: 'biji', grams_equivalent: 30 },
      { unit_label: 'porsi (5 biji)', grams_equivalent: 150 }
    ]
  },
  {
    name: 'Cireng (Aci Digoreng) Gorengan',
    calorie_per_100g: 360,
    carb_g: 85,
    protein_g: 1,
    fat_g: 2,
    portions: [
      { unit_label: 'biji', grams_equivalent: 20 },
      { unit_label: 'porsi (5 biji)', grams_equivalent: 100 }
    ]
  },
  {
    name: 'Cilok Bumbu Kacang',
    calorie_per_100g: 260,
    carb_g: 60,
    protein_g: 2,
    fat_g: 1,
    portions: [
      { unit_label: 'biji', grams_equivalent: 10 },
      { unit_label: 'tusuk (4 biji)', grams_equivalent: 40 }
    ]
  },
  {
    name: 'Gorengan Bakwan (Ote-Ote / Bala-Bala)',
    calorie_per_100g: 280,
    carb_g: 22,
    protein_g: 4,
    fat_g: 20,
    portions: [
      { unit_label: 'biji', grams_equivalent: 50 }
    ]
  },
  {
    name: 'Gorengan Tempe Mendoan',
    calorie_per_100g: 270,
    carb_g: 18,
    protein_g: 8,
    fat_g: 18,
    portions: [
      { unit_label: 'biji', grams_equivalent: 40 }
    ]
  },
  {
    name: 'Gorengan Tahu Isi',
    calorie_per_100g: 220,
    carb_g: 15,
    protein_g: 5,
    fat_g: 15,
    portions: [
      { unit_label: 'biji', grams_equivalent: 60 }
    ]
  },
  {
    name: 'Gorengan Pisang Goreng',
    calorie_per_100g: 252,
    carb_g: 42,
    protein_g: 2,
    fat_g: 10,
    portions: [
      { unit_label: 'biji', grams_equivalent: 60 }
    ]
  },
  {
    name: 'Kerupuk Kaleng Putih (Kerupuk Uyel)',
    calorie_per_100g: 476,
    carb_g: 70,
    protein_g: 1,
    fat_g: 20,
    portions: [
      { unit_label: 'buah', grams_equivalent: 15 }
    ]
  },
  {
    name: 'Es Teh Manis',
    calorie_per_100g: 40,
    carb_g: 10,
    protein_g: 0,
    fat_g: 0,
    portions: [
      { unit_label: 'gelas', grams_equivalent: 250 }
    ]
  },
  {
    name: 'Kopi Susu Gula Aren Kekinian',
    calorie_per_100g: 90,
    carb_g: 14,
    protein_g: 2,
    fat_g: 3,
    portions: [
      { unit_label: 'gelas / cup', grams_equivalent: 200 }
    ]
  },
  {
    name: 'Roti Bakar Cokelat Keju Bandung',
    calorie_per_100g: 280,
    carb_g: 45,
    protein_g: 6,
    fat_g: 8,
    portions: [
      { unit_label: 'potong', grams_equivalent: 75 },
      { unit_label: 'porsi (4 potong)', grams_equivalent: 300 }
    ]
  },
  {
    name: 'Pempek Kapal Selam Cuko',
    calorie_per_100g: 190,
    carb_g: 25,
    protein_g: 10,
    fat_g: 5,
    portions: [
      { unit_label: 'buah', grams_equivalent: 120 }
    ]
  },
  {
    name: 'Pempek Lenjer Cuko',
    calorie_per_100g: 165,
    carb_g: 24,
    protein_g: 8,
    fat_g: 4,
    portions: [
      { unit_label: 'buah', grams_equivalent: 80 }
    ]
  },
  {
    name: 'Bakso Pentol Daging Sapi Kuah',
    calorie_per_100g: 190,
    carb_g: 8,
    protein_g: 14,
    fat_g: 11,
    portions: [
      { unit_label: 'biji besar', grams_equivalent: 30 },
      { unit_label: 'biji kecil', grams_equivalent: 15 },
      { unit_label: 'porsi (1 mangkok)', grams_equivalent: 250 }
    ]
  },
  {
    name: 'Ketan Bubuk Kelapa Kedelai (Jajanan Pasar)',
    calorie_per_100g: 240,
    carb_g: 48,
    protein_g: 4,
    fat_g: 3,
    portions: [
      { unit_label: 'porsi', grams_equivalent: 100 }
    ]
  },
  {
    name: 'Cakue Goreng Saus',
    calorie_per_100g: 290,
    carb_g: 40,
    protein_g: 6,
    fat_g: 12,
    portions: [
      { unit_label: 'biji', grams_equivalent: 50 }
    ]
  },
  {
    name: 'Arem-Arem Rice Cake (Isi Daging/Sayur)',
    calorie_per_100g: 180,
    carb_g: 28,
    protein_g: 5,
    fat_g: 5,
    portions: [
      { unit_label: 'buah', grams_equivalent: 100 }
    ]
  },
  {
    name: 'Kue Lumpur (Jajanan Pasar)',
    calorie_per_100g: 150,
    carb_g: 24,
    protein_g: 2,
    fat_g: 5,
    portions: [
      { unit_label: 'buah', grams_equivalent: 50 }
    ]
  },
  {
    name: 'Onde-Onde Wijen Kacang Hijau',
    calorie_per_100g: 300,
    carb_g: 52,
    protein_g: 5,
    fat_g: 8,
    portions: [
      { unit_label: 'buah', grams_equivalent: 40 }
    ]
  },
  {
    name: 'Lupis Ketan Kelapa Parut Gula Merah',
    calorie_per_100g: 170,
    carb_g: 38,
    protein_g: 2,
    fat_g: 1,
    portions: [
      { unit_label: 'porsi (3 buah)', grams_equivalent: 120 },
      { unit_label: 'buah', grams_equivalent: 40 }
    ]
  },
  {
    name: 'Klepon Gula Merah (Jajanan Pasar)',
    calorie_per_100g: 210,
    carb_g: 46,
    protein_g: 2,
    fat_g: 2,
    portions: [
      { unit_label: 'porsi (5 biji)', grams_equivalent: 75 },
      { unit_label: 'biji', grams_equivalent: 15 }
    ]
  },
  {
    name: 'Indomie Goreng Spesial (Kemasan)',
    calorie_per_100g: 458,
    carb_g: 62,
    protein_g: 9,
    fat_g: 19,
    portions: [
      { unit_label: 'bungkus (kemasan standar)', grams_equivalent: 85 }
    ]
  },
  {
    name: 'Chitato Potato Chips Keju/Sapi (Kemasan)',
    calorie_per_100g: 520,
    carb_g: 56,
    protein_g: 7,
    fat_g: 30,
    portions: [
      { unit_label: 'bungkus (68g)', grams_equivalent: 68 }
    ]
  },
  {
    name: 'Oreo Biscuit Double Stuf (Kemasan)',
    calorie_per_100g: 490,
    carb_g: 70,
    protein_g: 4,
    fat_g: 21,
    portions: [
      { unit_label: 'bungkus kecil (3 keping)', grams_equivalent: 28 },
      { unit_label: 'keping', grams_equivalent: 9.5 }
    ]
  },
  {
    name: 'Beng-Beng Chocolate Wafer (Kemasan)',
    calorie_per_100g: 480,
    carb_g: 66,
    protein_g: 6,
    fat_g: 21,
    portions: [
      { unit_label: 'bungkus', grams_equivalent: 20 }
    ]
  },
  {
    name: 'Chiki Balls Keju/Cokelat (Kemasan)',
    calorie_per_100g: 470,
    carb_g: 65,
    protein_g: 6,
    fat_g: 20,
    portions: [
      { unit_label: 'bungkus', grams_equivalent: 55 }
    ]
  },
  {
    name: 'Roti Sobek Sari Roti Cokelat (Kemasan)',
    calorie_per_100g: 270,
    carb_g: 48,
    protein_g: 7,
    fat_g: 5,
    portions: [
      { unit_label: 'bungkus', grams_equivalent: 200 },
      { unit_label: 'sobekan (1 dari 4)', grams_equivalent: 50 }
    ]
  }
];
