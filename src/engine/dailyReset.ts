import { getDb } from '../db/client';
import { userProfileRepo } from '../repositories/userProfileRepo';
import { logRepo } from '../repositories/logRepo';
import { waterRepo } from '../repositories/waterRepo';
import { activityRepo } from '../repositories/activityRepo';

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
    // Get target calorie from profile
    const profile = await userProfileRepo.getUserProfile();
    const targetCalorie = profile?.target_calorie || 2000;

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

    // Update app_state to today
    await db.runAsync(
      "UPDATE app_state SET value = ? WHERE key = 'last_opened_date'",
      todayStr
    );
  });

  return true;
}
