export interface AchievementEvaluationParams {
  startWeightKg: number;
  currentWeightKg: number;
  targetWeightKg: number;
  goal: 'diet' | 'maintenance' | 'surplus';
  unlockedCodes: string[];
  foodLogStreak: number;
  waterStreak: number;
  weightLogCount: number;
  weighInOnTimeStreak: number;
}

/**
 * Checks which achievements should be unlocked.
 * Pure function, testable without database.
 */
export function checkAchievementsToUnlock(params: AchievementEvaluationParams): string[] {
  const toUnlock: string[] = [];
  const {
    startWeightKg,
    currentWeightKg,
    targetWeightKg,
    goal,
    unlockedCodes,
    foodLogStreak,
    waterStreak,
    weightLogCount,
    weighInOnTimeStreak
  } = params;

  const isUnlocked = (code: string) => unlockedCodes.includes(code) || toUnlock.includes(code);

  // 1. Weight Milestones (Diet)
  if (goal === 'diet' && startWeightKg > 0 && currentWeightKg > 0) {
    const loss = startWeightKg - currentWeightKg;
    if (loss >= 1.0 && !isUnlocked('WEIGHT_MINUS_1')) toUnlock.push('WEIGHT_MINUS_1');
    if (loss >= 3.0 && !isUnlocked('WEIGHT_MINUS_3')) toUnlock.push('WEIGHT_MINUS_3');
    if (loss >= 5.0 && !isUnlocked('WEIGHT_MINUS_5')) toUnlock.push('WEIGHT_MINUS_5');
    if (loss >= 10.0 && !isUnlocked('WEIGHT_MINUS_10')) toUnlock.push('WEIGHT_MINUS_10');

    // Target Reached
    if (currentWeightKg <= targetWeightKg && !isUnlocked('WEIGHT_GOAL_REACHED')) {
      toUnlock.push('WEIGHT_GOAL_REACHED');
    }
  }

  // 2. Weight Milestones (Surplus)
  if (goal === 'surplus' && startWeightKg > 0 && currentWeightKg > 0) {
    const gain = currentWeightKg - startWeightKg;
    if (gain >= 1.0 && !isUnlocked('WEIGHT_PLUS_1')) toUnlock.push('WEIGHT_PLUS_1');
    if (gain >= 3.0 && !isUnlocked('WEIGHT_PLUS_3')) toUnlock.push('WEIGHT_PLUS_3');
    if (gain >= 5.0 && !isUnlocked('WEIGHT_PLUS_5')) toUnlock.push('WEIGHT_PLUS_5');

    // Target Reached
    if (currentWeightKg >= targetWeightKg && !isUnlocked('WEIGHT_GOAL_REACHED')) {
      toUnlock.push('WEIGHT_GOAL_REACHED');
    }
  }

  // 3. Streak Food Log
  if (foodLogStreak >= 3 && !isUnlocked('STREAK_LOG_3')) toUnlock.push('STREAK_LOG_3');
  if (foodLogStreak >= 7 && !isUnlocked('STREAK_LOG_7')) toUnlock.push('STREAK_LOG_7');
  if (foodLogStreak >= 14 && !isUnlocked('STREAK_LOG_14')) toUnlock.push('STREAK_LOG_14');
  if (foodLogStreak >= 30 && !isUnlocked('STREAK_LOG_30')) toUnlock.push('STREAK_LOG_30');

  // 4. Streak Water Log
  if (waterStreak >= 3 && !isUnlocked('STREAK_WATER_3')) toUnlock.push('STREAK_WATER_3');
  if (waterStreak >= 7 && !isUnlocked('STREAK_WATER_7')) toUnlock.push('STREAK_WATER_7');

  // 5. Weigh In Consistency
  if (weightLogCount >= 1 && !isUnlocked('WEIGHIN_FIRST')) toUnlock.push('WEIGHIN_FIRST');
  if (weighInOnTimeStreak >= 3 && !isUnlocked('WEIGHIN_3X')) toUnlock.push('WEIGHIN_3X');
  if (weighInOnTimeStreak >= 5 && !isUnlocked('WEIGHIN_5X')) toUnlock.push('WEIGHIN_5X');

  return toUnlock;
}
