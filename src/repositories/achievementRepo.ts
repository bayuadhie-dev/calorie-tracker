import { getDb } from '../db/client';

export interface AchievementDefinition {
  id: number;
  code: string;
  label: string;
  description: string;
  category: 'weight' | 'streak' | 'hydration' | 'consistency';
}

export interface UserAchievement {
  id: number;
  achievement_code: string;
  unlocked_at: string;
  value_at_unlock: number | null;
}

export const achievementRepo = {
  async getDefinitions(): Promise<AchievementDefinition[]> {
    const db = await getDb();
    return db.getAllAsync<AchievementDefinition>(
      'SELECT * FROM achievement_definitions ORDER BY id ASC'
    );
  },

  async getUnlocked(): Promise<UserAchievement[]> {
    const db = await getDb();
    return db.getAllAsync<UserAchievement>(
      'SELECT * FROM user_achievements ORDER BY unlocked_at DESC'
    );
  },

  async unlock(code: string, valueAtUnlock: number | null = null): Promise<boolean> {
    const db = await getDb();
    let newlyUnlocked = false;
    await db.withTransactionAsync(async () => {
      // Check if already unlocked
      const existing = await db.getFirstAsync<UserAchievement>(
        'SELECT id FROM user_achievements WHERE achievement_code = ?',
        code
      );
      if (existing) {
        newlyUnlocked = false;
        return;
      }

      // Unlock it
      await db.runAsync(
        'INSERT INTO user_achievements (achievement_code, value_at_unlock) VALUES (?, ?)',
        code,
        valueAtUnlock
      );
      newlyUnlocked = true;
    });
    return newlyUnlocked;
  }
};
