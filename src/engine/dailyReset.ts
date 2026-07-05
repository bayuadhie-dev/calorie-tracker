import { getDb } from '../db/client';
import { userProfileRepo } from '../repositories/userProfileRepo';
import { logRepo } from '../repositories/logRepo';
import { waterRepo } from '../repositories/waterRepo';
import { activityRepo } from '../repositories/activityRepo';
import { calculateNextStreaks, StreakState, DailySummary } from './streakEngine';

export async function checkAndPerformDailyReset(todayStr: string): Promise<boolean> {
  const db = await getDb();
  
  // 1. Get the last opened date from app_state
  const lastOpenedRow = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_state WHERE key = 'last_opened_date'"
  );

  if (!lastOpenedRow) {
    // First time opening the app, initialize app_state
    await db.runAsync(
      "INSERT OR REPLACE INTO app_state (key, value) VALUES ('last_opened_date', ?)",
      todayStr
    );
    await db.runAsync("INSERT OR REPLACE INTO app_state (key, value) VALUES ('active_food_log_streak', '0')");
    await db.runAsync("INSERT OR REPLACE INTO app_state (key, value) VALUES ('active_water_streak', '0')");
    await db.runAsync("INSERT OR REPLACE INTO app_state (key, value) VALUES ('weigh_in_streak', '0')");
    await db.runAsync("INSERT OR REPLACE INTO app_state (key, value) VALUES ('streak_freeze_used_this_week', 'false')");
    return false;
  }

  const lastOpenedDate = lastOpenedRow.value;

  // 2. If dates are the same, no reset needed
  if (lastOpenedDate === todayStr) {
    return false;
  }

  console.log(`New day detected! Resetting from ${lastOpenedDate} to ${todayStr}. Locking yesterday's data...`);

  // 3. Lock previous day's data into daily_history
  await db.withTransactionAsync(async () => {
    // Get profile details
    const profile = await userProfileRepo.getUserProfile();
    const targetCalorie = profile?.target_calorie || 2000;
    const targetWater = profile?.target_water_ml || 2000;

    // Get food logs sum for lastOpenedDate
    const foodLogs = await logRepo.getFoodLogs(lastOpenedDate);
    const totals = foodLogs.reduce(
      (acc, item) => {
        acc.calorie += item.calorie;
        acc.carb_g += item.carb_g;
        acc.protein_g += item.protein_g;
        acc.fat_g += item.fat_g;
        return acc;
      },
      { calorie: 0, carb_g: 0, protein_g: 0, fat_g: 0 }
    );

    // Get water logs sum for lastOpenedDate
    const totalWaterMl = await waterRepo.getWaterLogsSum(lastOpenedDate);

    // Get checklist summary for lastOpenedDate
    const checklistSummary = await activityRepo.getChecklistSummary(lastOpenedDate);

    // Insert aggregated history row
    await db.runAsync(
      `INSERT OR REPLACE INTO daily_history (
        log_date, total_calorie, total_carb_g, total_protein_g, total_fat_g,
        total_water_ml, target_calorie, activity_completed_count, activity_total_count, locked_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      lastOpenedDate,
      Math.round(totals.calorie),
      Math.round(totals.carb_g * 10) / 10,
      Math.round(totals.protein_g * 10) / 10,
      Math.round(totals.fat_g * 10) / 10,
      totalWaterMl,
      targetCalorie,
      checklistSummary.completed,
      checklistSummary.total
    );

    // 4. Calculate Streak updates (v2)
    const foodStreakRow = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_state WHERE key = 'active_food_log_streak'");
    const currentFoodStreak = foodStreakRow ? parseInt(foodStreakRow.value, 10) : 0;

    const waterStreakRow = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_state WHERE key = 'active_water_streak'");
    const currentWaterStreak = waterStreakRow ? parseInt(waterStreakRow.value, 10) : 0;

    const freezeUsedRow = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_state WHERE key = 'streak_freeze_used_this_week'");
    const currentFreezeUsed = freezeUsedRow ? freezeUsedRow.value === 'true' : false;

    // Calculate elapsed days
    const lastTime = new Date(lastOpenedDate).getTime();
    const todayTime = new Date(todayStr).getTime();
    const daysMissed = Math.max(1, Math.round((todayTime - lastTime) / (1000 * 60 * 60 * 24)));

    const isMonday = new Date(todayStr).getDay() === 1;

    const currentState: StreakState = {
      foodLogStreak: currentFoodStreak,
      waterStreak: currentWaterStreak,
      freezeUsedThisWeek: currentFreezeUsed,
    };

    const yesterdaySummary: DailySummary = {
      calorieLogged: totals.calorie,
      waterLogged: totalWaterMl,
      waterTarget: targetWater,
    };

    const { nextState, freezeSavedStreak } = calculateNextStreaks(
      currentState,
      yesterdaySummary,
      isMonday,
      daysMissed
    );

    // Save next state to db app_state
    await db.runAsync("INSERT OR REPLACE INTO app_state (key, value) VALUES ('active_food_log_streak', ?)", nextState.foodLogStreak.toString());
    await db.runAsync("INSERT OR REPLACE INTO app_state (key, value) VALUES ('active_water_streak', ?)", nextState.waterStreak.toString());
    await db.runAsync("INSERT OR REPLACE INTO app_state (key, value) VALUES ('streak_freeze_used_this_week', ?)", nextState.freezeUsedThisWeek ? 'true' : 'false');

    if (freezeSavedStreak) {
      // Store alert message for dashboard to query and show
      await db.runAsync("INSERT OR REPLACE INTO app_state (key, value) VALUES ('streak_freeze_alert_message', 'STREAK DISELAMATKAN! (1X/MINGGU)')");
    }

    // Update app_state to today
    await db.runAsync(
      "UPDATE app_state SET value = ? WHERE key = 'last_opened_date'",
      todayStr
    );
  });

  return true;
}
