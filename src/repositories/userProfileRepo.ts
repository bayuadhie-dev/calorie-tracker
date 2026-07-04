import { getDb } from '../db/client';
import { Gender, Goal, ActivityLevel } from '../engine/bmrTdee';

export interface UserProfile {
  weight_kg: number;
  target_weight_kg: number;
  height_cm: number;
  age: number;
  gender: Gender;
  goal: Goal;
  activity_level: ActivityLevel;
  bmr: number;
  tdee: number;
  target_calorie: number;
  target_carb_g: number;
  target_protein_g: number;
  target_fat_g: number;
  target_water_ml: number;
  created_at?: string;
  updated_at?: string;
}

export const userProfileRepo = {
  async getUserProfile(): Promise<UserProfile | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<UserProfile>('SELECT * FROM user_profile WHERE id = 1');
    return row || null;
  },

  async saveUserProfile(profile: UserProfile): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO user_profile (
        id, weight_kg, target_weight_kg, height_cm, age, gender, goal, activity_level,
        bmr, tdee, target_calorie, target_carb_g, target_protein_g, target_fat_g, target_water_ml,
        updated_at
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      profile.weight_kg,
      profile.target_weight_kg,
      profile.height_cm,
      profile.age,
      profile.gender,
      profile.goal,
      profile.activity_level,
      profile.bmr,
      profile.tdee,
      profile.target_calorie,
      profile.target_carb_g,
      profile.target_protein_g,
      profile.target_fat_g,
      profile.target_water_ml
    );
  },

  async getFoodRestrictions(): Promise<number[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<{ tag_id: number }>(
      'SELECT tag_id FROM user_food_restrictions WHERE user_id = 1'
    );
    return rows.map((r) => r.tag_id);
  },

  async saveFoodRestrictions(tagIds: number[]): Promise<void> {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      // Clear existing restrictions
      await db.runAsync('DELETE FROM user_food_restrictions WHERE user_id = 1');
      
      // Insert new ones
      for (const tagId of tagIds) {
        await db.runAsync(
          'INSERT INTO user_food_restrictions (user_id, tag_id) VALUES (1, ?)',
          tagId
        );
      }
    });
  }
};
