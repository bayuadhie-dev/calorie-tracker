import { getDb } from '../db/client';

export interface FoodItem {
  id: number;
  name: string;
  calorie_per_100g: number;
  carb_g: number;
  protein_g: number;
  fat_g: number;
  default_serving_g: number;
  source: 'tkpi' | 'custom';
  is_custom: number;
}

export interface FoodPortion {
  id?: number;
  food_item_id?: number;
  unit_label: string;
  grams_equivalent: number;
}

export interface RestrictionTag {
  id: number;
  code: string;
  label: string;
}

export const foodRepo = {
  async getRestrictionTags(): Promise<RestrictionTag[]> {
    const db = await getDb();
    return db.getAllAsync<RestrictionTag>('SELECT * FROM food_restriction_tags ORDER BY id ASC');
  },

  async searchFoods(query: string, restrictedTagIds: number[] = []): Promise<FoodItem[]> {
    const db = await getDb();
    const sqlQuery = `%${query.trim()}%`;
    
    if (restrictedTagIds.length === 0) {
      return db.getAllAsync<FoodItem>(
        `SELECT * FROM food_items 
         WHERE name LIKE ? 
         ORDER BY is_custom DESC, name ASC 
         LIMIT 60`,
        sqlQuery
      );
    }

    // Build the query that excludes foods matching restricted tag IDs
    const placeholders = restrictedTagIds.map(() => '?').join(',');
    return db.getAllAsync<FoodItem>(
      `SELECT f.* FROM food_items f
       WHERE f.name LIKE ?
       AND NOT EXISTS (
         SELECT 1 FROM food_item_tags fit
         WHERE fit.food_item_id = f.id
         AND fit.tag_id IN (${placeholders})
       )
       ORDER BY f.is_custom DESC, f.name ASC
       LIMIT 60`,
      sqlQuery,
      ...restrictedTagIds
    );
  },

  async getFoodPortions(foodItemId: number): Promise<FoodPortion[]> {
    const db = await getDb();
    return db.getAllAsync<FoodPortion>(
      'SELECT * FROM food_portion_units WHERE food_item_id = ? ORDER BY grams_equivalent ASC',
      foodItemId
    );
  },

  async addCustomFood(
    name: string,
    caloriePer100g: number,
    carbG: number,
    proteinG: number,
    fatG: number,
    portions: Omit<FoodPortion, 'food_item_id'>[] = [],
    tagIds: number[] = []
  ): Promise<number> {
    const db = await getDb();
    let foodItemId = 0;

    await db.withTransactionAsync(async () => {
      // 1. Insert food_item
      const result = await db.runAsync(
        `INSERT INTO food_items (name, calorie_per_100g, carb_g, protein_g, fat_g, default_serving_g, source, is_custom)
         VALUES (?, ?, ?, ?, ?, 100.0, 'custom', 1)`,
        name,
        caloriePer100g,
        carbG,
        proteinG,
        fatG
      );
      
      foodItemId = result.lastInsertRowId;

      // 2. Insert Portions
      for (const port of portions) {
        await db.runAsync(
          'INSERT INTO food_portion_units (food_item_id, unit_label, grams_equivalent) VALUES (?, ?, ?)',
          foodItemId,
          port.unit_label,
          port.grams_equivalent
        );
      }

      // 3. Insert tags
      for (const tagId of tagIds) {
        await db.runAsync(
          'INSERT INTO food_item_tags (food_item_id, tag_id) VALUES (?, ?)',
          foodItemId,
          tagId
        );
      }
    });

    return foodItemId;
  }
};
