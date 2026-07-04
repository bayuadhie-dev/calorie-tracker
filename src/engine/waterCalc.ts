import { ActivityLevel, Goal } from './bmrTdee';

// Constants for water calculation modifiers in mL
export const WATER_ACTIVITY_MODIFIERS: Record<ActivityLevel, number> = {
  sedentary: 0,
  light: 250,
  moderate: 500,
  active: 750,
  very_active: 1000,
};

export const WATER_GOAL_MODIFIERS: Record<Goal, number> = {
  diet: 250,        // Help with satiety
  maintenance: 0,
  surplus: 500,     // Needed for digestion of more food / protein synthesis
};

/**
 * Calculates daily water intake target in mL based on:
 * Formula: (weightKg * 33) + activity_modifier + goal_modifier
 */
export function calculateWaterTarget(weightKg: number, activityLevel: ActivityLevel, goal: Goal): number {
  const baseWaterMl = weightKg * 33;
  const activityModifier = WATER_ACTIVITY_MODIFIERS[activityLevel] || 0;
  const goalModifier = WATER_GOAL_MODIFIERS[goal] || 0;

  const totalWaterMl = baseWaterMl + activityModifier + goalModifier;
  
  // Round to nearest 50ml for practical tracking (e.g. 2135ml -> 2150ml)
  return Math.round(totalWaterMl / 50) * 50;
}
