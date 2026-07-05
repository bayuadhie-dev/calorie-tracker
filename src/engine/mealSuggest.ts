export interface FoodItemSuggest {
  id: number;
  name: string;
  calorie_per_100g: number;
  default_serving_g: number;
  carb_g: number;
  protein_g: number;
  fat_g: number;
  tagIds: number[];
  portions: { unit_label: string; grams_equivalent: number }[];
}

/**
 * Pure function to suggest foods for a specific meal slot.
 * Excludes restricted tags, prioritizes preferred tags, and orders by closest calorie match.
 * Testable without database.
 */
export function suggestMealsForSlot(
  slot: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  dailyCalorieTarget: number,
  foods: FoodItemSuggest[],
  restrictedTagIds: number[],
  preferredTagIds: number[]
): FoodItemSuggest[] {
  // 1. Calculate slot calorie target
  let slotRatio = 0.25; // breakfast
  if (slot === 'lunch') slotRatio = 0.35;
  else if (slot === 'dinner') slotRatio = 0.30;
  else if (slot === 'snack') slotRatio = 0.10;

  const slotTargetCalorie = dailyCalorieTarget * slotRatio;

  // 2. Filter foods: exclude restricted tags
  const filteredFoods = foods.filter((food) => {
    const isRestricted = food.tagIds.some((tId) => restrictedTagIds.includes(tId));
    return !isRestricted;
  });

  // 3. Score foods based on preferences and calorie closeness
  const scoredFoods = filteredFoods.map((food) => {
    // Preference match count
    const prefMatchCount = food.tagIds.filter((tId) => preferredTagIds.includes(tId)).length;

    // Typical calorie for one default serving (or portions[0] if exists)
    const portionGrams = food.default_serving_g || 100;
    const typicalCalorie = (food.calorie_per_100g * portionGrams) / 100;

    // Calorie closeness score (closer is better, i.e., smaller difference)
    const calorieDiff = Math.abs(typicalCalorie - slotTargetCalorie);

    return {
      food,
      prefMatchCount,
      calorieDiff
    };
  });

  // 4. Sort: prefMatchCount DESC, then calorieDiff ASC
  scoredFoods.sort((a, b) => {
    if (b.prefMatchCount !== a.prefMatchCount) {
      return b.prefMatchCount - a.prefMatchCount; // higher matches first
    }
    return a.calorieDiff - b.calorieDiff; // closer calorie first
  });

  // 5. Limit to 5 suggestions
  return scoredFoods.slice(0, 5).map((sf) => sf.food);
}
