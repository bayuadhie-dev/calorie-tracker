import { getDb } from '../db/client';
import { userProfileRepo } from './userProfileRepo';

export interface WeightLog {
  id: number;
  log_date: string;
  weight_kg: number;
  note: string | null;
  created_at?: string;
}

export const weightRepo = {
  async addWeightLog(weightKg: number, date: string, note: string | null = null): Promise<void> {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      // 1. Insert into weight_logs
      await db.runAsync(
        'INSERT INTO weight_logs (log_date, weight_kg, note) VALUES (?, ?, ?)',
        date,
        weightKg,
        note
      );

      // 2. Calculate weigh-in streak (consistency badge requirement)
      const profile = await userProfileRepo.getUserProfile();
      let nextStreak = 1;

      if (profile && profile.last_weigh_in_date) {
        const lastDate = new Date(profile.last_weigh_in_date);
        const todayDate = new Date(date);
        const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const interval = profile.weigh_in_interval_days || 7;

        // Get current streak
        const streakRow = await db.getFirstAsync<{ value: string }>(
          "SELECT value FROM app_state WHERE key = 'weigh_in_streak'"
        );
        const currentStreak = streakRow ? parseInt(streakRow.value, 10) : 0;

        if (diffDays <= interval) {
          nextStreak = currentStreak + 1;
        } else {
          nextStreak = 1;
        }
      }

      await db.runAsync(
        "INSERT OR REPLACE INTO app_state (key, value) VALUES ('weigh_in_streak', ?)",
        nextStreak.toString()
      );

      // 3. Update current weight and last weigh in date in user_profile
      await db.runAsync(
        'UPDATE user_profile SET weight_kg = ?, last_weigh_in_date = ? WHERE id = 1',
        weightKg,
        date
      );
    });
  },

  async getWeightLogs(): Promise<WeightLog[]> {
    const db = await getDb();
    return db.getAllAsync<WeightLog>(
      'SELECT * FROM weight_logs ORDER BY log_date DESC, id DESC'
    );
  },

  async getWeightLogsAsc(): Promise<WeightLog[]> {
    const db = await getDb();
    return db.getAllAsync<WeightLog>(
      'SELECT * FROM weight_logs ORDER BY log_date ASC, id ASC'
    );
  },

  async deleteWeightLog(id: number): Promise<void> {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      // Get the log we are deleting
      const log = await db.getFirstAsync<WeightLog>('SELECT * FROM weight_logs WHERE id = ?', id);
      if (!log) return;

      // Delete it
      await db.runAsync('DELETE FROM weight_logs WHERE id = ?', id);

      // Check if there are other logs to revert user_profile weight
      const latestLog = await db.getFirstAsync<WeightLog>(
        'SELECT * FROM weight_logs ORDER BY log_date DESC, id DESC LIMIT 1'
      );

      if (latestLog) {
        await db.runAsync(
          'UPDATE user_profile SET weight_kg = ?, last_weigh_in_date = ? WHERE id = 1',
          latestLog.weight_kg,
          latestLog.log_date
        );
      } else {
        // If no logs left, we keep user_profile weight but clear last weigh in date
        await db.runAsync(
          'UPDATE user_profile SET last_weigh_in_date = NULL WHERE id = 1'
        );
      }
    });
  }
};
