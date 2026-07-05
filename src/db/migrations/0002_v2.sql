-- 1. Alter food_restriction_tags table to add type column
ALTER TABLE food_restriction_tags ADD COLUMN type TEXT DEFAULT 'restriction' CHECK (type IN ('restriction', 'preference'));

-- 2. Create user_food_preferences table
CREATE TABLE IF NOT EXISTS user_food_preferences (
    user_id INTEGER NOT NULL DEFAULT 1,
    tag_id INTEGER NOT NULL REFERENCES food_restriction_tags(id),
    PRIMARY KEY (user_id, tag_id)
);

-- 3. Alter user_profile table to add weight & interval columns
ALTER TABLE user_profile ADD COLUMN target_weight_kg REAL;
ALTER TABLE user_profile ADD COLUMN start_weight_kg REAL;
ALTER TABLE user_profile ADD COLUMN weigh_in_interval_days INTEGER DEFAULT 7;
ALTER TABLE user_profile ADD COLUMN last_weigh_in_date TEXT;

-- 4. Create weight_logs table
CREATE TABLE IF NOT EXISTS weight_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_date TEXT NOT NULL,
    weight_kg REAL NOT NULL,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_weight_logs_date ON weight_logs(log_date);

-- 5. Create achievement_definitions table
CREATE TABLE IF NOT EXISTS achievement_definitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('weight','streak','hydration','consistency'))
);

-- 6. Create user_achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    achievement_code TEXT NOT NULL REFERENCES achievement_definitions(code),
    unlocked_at TEXT DEFAULT (datetime('now')),
    value_at_unlock REAL
);

-- 7. Create daily_notes table
CREATE TABLE IF NOT EXISTS daily_notes (
    log_date TEXT PRIMARY KEY,
    mood TEXT CHECK (mood IN ('great','good','neutral','bad','terrible')),
    note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
