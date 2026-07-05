export interface StreakState {
  foodLogStreak: number;
  waterStreak: number;
  freezeUsedThisWeek: boolean;
}

export interface DailySummary {
  calorieLogged: number;
  waterLogged: number;
  waterTarget: number;
}

/**
 * Calculates next streaks based on yesterday's activity.
 * Pure function.
 */
export function calculateNextStreaks(
  currentState: StreakState,
  yesterdaySummary: DailySummary,
  isMonday: boolean,
  daysMissed: number // 1 if normal rollover, > 1 if app wasn't opened for multiple days
): {
  nextState: StreakState;
  freezeSavedStreak: boolean;
} {
  const nextState = { ...currentState };
  let freezeSavedStreak = false;

  // 1. Reset freeze on Monday
  if (isMonday) {
    nextState.freezeUsedThisWeek = false;
  }

  // 2. Food log streak
  if (daysMissed > 1) {
    // If they missed multiple days, streak is dead (freeze can only save 1 day)
    nextState.foodLogStreak = 0;
  } else {
    if (yesterdaySummary.calorieLogged > 0) {
      nextState.foodLogStreak += 1;
    } else {
      // Skipped yesterday. Can we freeze?
      if (!nextState.freezeUsedThisWeek) {
        nextState.freezeUsedThisWeek = true;
        freezeSavedStreak = true;
        // foodLogStreak remains the same (does not increment, but does not reset)
      } else {
        nextState.foodLogStreak = 0;
      }
    }
  }

  // 3. Water log streak
  if (daysMissed > 1) {
    nextState.waterStreak = 0;
  } else {
    if (yesterdaySummary.waterLogged >= yesterdaySummary.waterTarget) {
      nextState.waterStreak += 1;
    } else {
      nextState.waterStreak = 0;
    }
  }

  return { nextState, freezeSavedStreak };
}
