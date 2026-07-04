-- ================= USER & PROFILE =================
CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    weight_kg REAL NOT NULL,
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

-- ================= FOOD DATABASE (LOCAL, PRE-POPULATED DARI TKPI/KAGGLE) =================
CREATE TABLE IF NOT EXISTS food_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    calorie_per_100g REAL NOT NULL,
    carb_g REAL NOT NULL,
    protein_g REAL NOT NULL,
    fat_g REAL NOT NULL,
    default_serving_g REAL DEFAULT 100,
    source TEXT DEFAULT 'tkpi',        -- 'tkpi' (seed) atau 'custom'
    is_custom INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS food_portion_units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    food_item_id INTEGER NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
    unit_label TEXT NOT NULL,          -- 'centong', 'piring', 'potong', 'butir'
    grams_equivalent REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS food_item_tags (
    food_item_id INTEGER NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES food_restriction_tags(id),
    PRIMARY KEY (food_item_id, tag_id)
);

-- ================= DAILY LOGS (HARI BERJALAN) =================
CREATE TABLE IF NOT EXISTS food_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    food_item_id INTEGER REFERENCES food_items(id),
    log_date TEXT NOT NULL,            -- format 'YYYY-MM-DD'
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
    log_date TEXT NOT NULL,            -- format 'YYYY-MM-DD'
    amount_ml INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activity_checklist_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    applicable_goal TEXT               -- 'diet', 'maintenance', 'surplus', or NULL (all)
);

CREATE TABLE IF NOT EXISTS activity_checklist_daily (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER REFERENCES activity_checklist_templates(id),
    log_date TEXT NOT NULL,            -- format 'YYYY-MM-DD'
    is_done INTEGER DEFAULT 0,
    done_at TEXT
);

-- ================= HISTORY =================
CREATE TABLE IF NOT EXISTS daily_history (
    log_date TEXT PRIMARY KEY,         -- format 'YYYY-MM-DD'
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

-- ================= APP STATE (untuk daily reset guard) =================
CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- ================= INDEXES =================
CREATE INDEX IF NOT EXISTS idx_food_logs_date ON food_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_water_logs_date ON water_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_activity_daily_date ON activity_checklist_daily(log_date);
CREATE INDEX IF NOT EXISTS idx_food_items_custom ON food_items(is_custom);
CREATE INDEX IF NOT EXISTS idx_food_items_name ON food_items(name);
