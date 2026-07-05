import { getDb } from '../db/client';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodLog {
  id: number;
  food_item_id: number | null;
  food_name?: string; // Joined from food_items
  food_source?: 'tkpi' | 'custom' | 'local';
  log_date: string;
  meal_type: MealType;
  serving_g: number;
  calorie: number;
  carb_g: number;
  protein_g: number;
  fat_g: number;
  created_at: string;
}

export const logRepo = {
  async getFoodLogs(date: string): Promise<FoodLog[]> {
    const db = await getDb();
    return db.getAllAsync<FoodLog>(
      `SELECT fl.*, fi.name as food_name, fi.source as food_source
       FROM food_logs fl
       LEFT JOIN food_items fi ON fl.food_item_id = fi.id
       WHERE fl.log_date = ?
       ORDER BY fl.created_at ASC`,
      date
    );
  },

  async addFoodLog(
    foodItemId: number | null,
    date: string,
    mealType: MealType,
    servingG: number,
    calorie: number,
    carbG: number,
    proteinG: number,
    fatG: number
  ): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO food_logs (food_item_id, log_date, meal_type, serving_g, calorie, carb_g, protein_g, fat_g)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      foodItemId,
      date,
      mealType,
      servingG,
      calorie,
      carbG,
      proteinG,
      fatG
    );
  },

  async deleteFoodLog(logId: number): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM food_logs WHERE id = ?', logId);
  },

  async getYesterdayLogs(yesterdayDate: string): Promise<FoodLog[]> {
    return this.getFoodLogs(yesterdayDate);
  },

  async copyLogsToToday(ids: number[], todayDate: string): Promise<void> {
    const db = await getDb();
    if (ids.length === 0) return;

    await db.withTransactionAsync(async () => {
      const placeholders = ids.map(() => '?').join(',');
      const logsToCopy = await db.getAllAsync<FoodLog>(
        `SELECT * FROM food_logs WHERE id IN (${placeholders})`,
        ...ids
      );

      for (const log of logsToCopy) {
        await db.runAsync(
          `INSERT INTO food_logs (food_item_id, log_date, meal_type, serving_g, calorie, carb_g, protein_g, fat_g)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          log.food_item_id,
          todayDate,
          log.meal_type,
          log.serving_g,
          log.calorie,
          log.carb_g,
          log.protein_g,
          log.fat_g
        );
      }
    });
  }
};
