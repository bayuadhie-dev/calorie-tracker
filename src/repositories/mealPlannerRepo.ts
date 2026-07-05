import { getDb } from '../db/client';
import { FoodItemSuggest } from '../engine/mealSuggest';

export const mealPlannerRepo = {
  async getFoodCandidates(): Promise<FoodItemSuggest[]> {
    const db = await getDb();
    
    // 1. Fetch all foods
    const foods = await db.getAllAsync<{
      id: number;
      name: string;
      calorie_per_100g: number;
      default_serving_g: number;
      carb_g: number;
      protein_g: number;
      fat_g: number;
    }>(
      `SELECT id, name, calorie_per_100g, default_serving_g, carb_g, protein_g, fat_g 
       FROM food_items`
    );

    // 2. Fetch all portions
    const portions = await db.getAllAsync<{
      food_item_id: number;
      unit_label: string;
      grams_equivalent: number;
    }>('SELECT food_item_id, unit_label, grams_equivalent FROM food_portion_units');

    // Group portions by food_item_id
    const portionMap = new Map<number, { unit_label: string; grams_equivalent: number }[]>();
    portions.forEach((p) => {
      const list = portionMap.get(p.food_item_id) || [];
      list.push({ unit_label: p.unit_label, grams_equivalent: p.grams_equivalent });
      portionMap.set(p.food_item_id, list);
    });

    // 3. Fetch all food tags
    const tags = await db.getAllAsync<{
      food_item_id: number;
      tag_id: number;
    }>('SELECT food_item_id, tag_id FROM food_item_tags');

    // Group tags by food_item_id
    const tagMap = new Map<number, number[]>();
    tags.forEach((t) => {
      const list = tagMap.get(t.food_item_id) || [];
      list.push(t.tag_id);
      tagMap.set(t.food_item_id, list);
    });

    // 4. Map them together
    return foods.map((f) => ({
      id: f.id,
      name: f.name,
      calorie_per_100g: f.calorie_per_100g,
      default_serving_g: f.default_serving_g,
      carb_g: f.carb_g,
      protein_g: f.protein_g,
      fat_g: f.fat_g,
      tagIds: tagMap.get(f.id) || [],
      portions: portionMap.get(f.id) || []
    }));
  }
};
