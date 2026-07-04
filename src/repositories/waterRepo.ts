import { getDb } from '../db/client';

export interface WaterLog {
  id: number;
  log_date: string;
  amount_ml: number;
  created_at: string;
}

export const waterRepo = {
  async getWaterLogsSum(date: string): Promise<number> {
    const db = await getDb();
    const result = await db.getFirstAsync<{ total: number | null }>(
      'SELECT SUM(amount_ml) as total FROM water_logs WHERE log_date = ?',
      date
    );
    return result?.total || 0;
  },

  async getWaterLogs(date: string): Promise<WaterLog[]> {
    const db = await getDb();
    return db.getAllAsync<WaterLog>(
      'SELECT * FROM water_logs WHERE log_date = ? ORDER BY created_at DESC',
      date
    );
  },

  async addWaterLog(date: string, amountMl: number): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      'INSERT INTO water_logs (log_date, amount_ml) VALUES (?, ?)',
      date,
      amountMl
    );
  },

  async removeLastWaterLog(date: string): Promise<void> {
    const db = await getDb();
    // Get the ID of the last logged water for this date
    const lastLog = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM water_logs WHERE log_date = ? ORDER BY id DESC LIMIT 1',
      date
    );
    
    if (lastLog) {
      await db.runAsync('DELETE FROM water_logs WHERE id = ?', lastLog.id);
    }
  }
};
