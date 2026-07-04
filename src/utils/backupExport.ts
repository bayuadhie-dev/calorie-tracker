import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDb } from '../db/client';

export interface BackupData {
  version: number;
  user_profile: any[];
  user_food_restrictions: any[];
  custom_food_items: any[];
  custom_food_portions: any[];
  custom_food_tags: any[];
  food_logs: any[];
  water_logs: any[];
  activity_checklist_daily: any[];
  daily_history: any[];
  app_state: any[];
}

export async function exportBackup(): Promise<boolean> {
  try {
    const db = await getDb();

    // 1. Fetch all user data tables
    const userProfile = await db.getAllAsync('SELECT * FROM user_profile');
    const userRestrictions = await db.getAllAsync('SELECT * FROM user_food_restrictions');
    
    // Fetch custom foods and their related tables
    const customFoodItems = await db.getAllAsync('SELECT * FROM food_items WHERE is_custom = 1');
    const customFoodPortions = await db.getAllAsync(
      `SELECT fpu.* FROM food_portion_units fpu 
       JOIN food_items fi ON fpu.food_item_id = fi.id 
       WHERE fi.is_custom = 1`
    );
    const customFoodTags = await db.getAllAsync(
      `SELECT fit.* FROM food_item_tags fit 
       JOIN food_items fi ON fit.food_item_id = fi.id 
       WHERE fi.is_custom = 1`
    );

    const foodLogs = await db.getAllAsync('SELECT * FROM food_logs');
    const waterLogs = await db.getAllAsync('SELECT * FROM water_logs');
    const activityChecklistDaily = await db.getAllAsync('SELECT * FROM activity_checklist_daily');
    const dailyHistory = await db.getAllAsync('SELECT * FROM daily_history');
    const appState = await db.getAllAsync('SELECT * FROM app_state');

    // 2. Prepare JSON structure
    const backup: BackupData = {
      version: 1,
      user_profile: userProfile,
      user_food_restrictions: userRestrictions,
      custom_food_items: customFoodItems,
      custom_food_portions: customFoodPortions,
      custom_food_tags: customFoodTags,
      food_logs: foodLogs,
      water_logs: waterLogs,
      activity_checklist_daily: activityChecklistDaily,
      daily_history: dailyHistory,
      app_state: appState,
    };

    const backupString = JSON.stringify(backup, null, 2);
    
    // 3. Write JSON to local cache directory
    const fileUri = `${(FileSystem as any).cacheDirectory}calorie_tracker_backup.json`;
    await FileSystem.writeAsStringAsync(fileUri, backupString, {
      encoding: 'utf8',
    });

    // 4. Share the file via Native Sharing Drawer
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Simpan Backup Calorie Tracker',
        UTI: 'public.json',
      });
      return true;
    } else {
      console.warn('Sharing is not available on this device');
      return false;
    }
  } catch (error) {
    console.error('Failed to export backup:', error);
    return false;
  }
}

export async function importBackup(): Promise<{ success: boolean; errorMsg?: string }> {
  try {
    // 1. Pick a file
    const pickerResult = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
      return { success: false, errorMsg: 'Pengambilan file dibatalkan' };
    }

    const fileUri = pickerResult.assets[0].uri;
    
    // 2. Read file contents
    const jsonString = await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'utf8',
    });

    const backup = JSON.parse(jsonString) as BackupData;

    // 3. Validate backup structure
    if (!backup.user_profile || !backup.food_logs || !backup.water_logs || !backup.daily_history) {
      return { success: false, errorMsg: 'Format file backup tidak valid!' };
    }

    const db = await getDb();

    // 4. Clear and Restore tables in a single transaction
    await db.withTransactionAsync(async () => {
      // Clear tables
      await db.runAsync('DELETE FROM user_profile');
      await db.runAsync('DELETE FROM user_food_restrictions');
      await db.runAsync('DELETE FROM food_logs');
      await db.runAsync('DELETE FROM water_logs');
      await db.runAsync('DELETE FROM activity_checklist_daily');
      await db.runAsync('DELETE FROM daily_history');
      await db.runAsync('DELETE FROM app_state');
      
      // Delete old custom foods and their dependencies
      await db.runAsync('DELETE FROM food_portion_units WHERE food_item_id IN (SELECT id FROM food_items WHERE is_custom = 1)');
      await db.runAsync('DELETE FROM food_item_tags WHERE food_item_id IN (SELECT id FROM food_items WHERE is_custom = 1)');
      await db.runAsync('DELETE FROM food_items WHERE is_custom = 1');

      // Restore custom foods
      for (const item of backup.custom_food_items || []) {
        await db.runAsync(
          `INSERT INTO food_items (id, name, calorie_per_100g, carb_g, protein_g, fat_g, default_serving_g, source, is_custom)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          item.id,
          item.name,
          item.calorie_per_100g,
          item.carb_g,
          item.protein_g,
          item.fat_g,
          item.default_serving_g,
          item.source,
          item.is_custom
        );
      }

      for (const port of backup.custom_food_portions || []) {
        await db.runAsync(
          `INSERT INTO food_portion_units (id, food_item_id, unit_label, grams_equivalent)
           VALUES (?, ?, ?, ?)`,
          port.id,
          port.food_item_id,
          port.unit_label,
          port.grams_equivalent
        );
      }

      for (const tag of backup.custom_food_tags || []) {
        await db.runAsync(
          `INSERT INTO food_item_tags (food_item_id, tag_id)
           VALUES (?, ?)`,
          tag.food_item_id,
          tag.tag_id
        );
      }

      // Restore other logs & profiles
      for (const profile of backup.user_profile) {
        await db.runAsync(
          `INSERT INTO user_profile (id, weight_kg, height_cm, age, gender, goal, activity_level, bmr, tdee, target_calorie, target_carb_g, target_protein_g, target_fat_g, target_water_ml, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          profile.id,
          profile.weight_kg,
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
          profile.target_water_ml,
          profile.created_at,
          profile.updated_at
        );
      }

      for (const rest of backup.user_food_restrictions || []) {
        await db.runAsync(
          'INSERT INTO user_food_restrictions (user_id, tag_id) VALUES (?, ?)',
          rest.user_id,
          rest.tag_id
        );
      }

      for (const log of backup.food_logs) {
        await db.runAsync(
          `INSERT INTO food_logs (id, food_item_id, log_date, meal_type, serving_g, calorie, carb_g, protein_g, fat_g, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          log.id,
          log.food_item_id,
          log.log_date,
          log.meal_type,
          log.serving_g,
          log.calorie,
          log.carb_g,
          log.protein_g,
          log.fat_g,
          log.created_at
        );
      }

      for (const log of backup.water_logs) {
        await db.runAsync(
          `INSERT INTO water_logs (id, log_date, amount_ml, created_at)
           VALUES (?, ?, ?, ?)`,
          log.id,
          log.log_date,
          log.amount_ml,
          log.created_at
        );
      }

      for (const checklist of backup.activity_checklist_daily || []) {
        await db.runAsync(
          `INSERT INTO activity_checklist_daily (id, template_id, log_date, is_done, done_at)
           VALUES (?, ?, ?, ?, ?)`,
          checklist.id,
          checklist.template_id,
          checklist.log_date,
          checklist.is_done,
          checklist.done_at
        );
      }

      for (const hist of backup.daily_history) {
        await db.runAsync(
          `INSERT INTO daily_history (log_date, total_calorie, total_carb_g, total_protein_g, total_fat_g, total_water_ml, target_calorie, activity_completed_count, activity_total_count, locked_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          hist.log_date,
          hist.total_calorie,
          hist.total_carb_g,
          hist.total_protein_g,
          hist.total_fat_g,
          hist.total_water_ml,
          hist.target_calorie,
          hist.activity_completed_count,
          hist.activity_total_count,
          hist.locked_at
        );
      }

      for (const state of backup.app_state || []) {
        await db.runAsync(
          'INSERT INTO app_state (key, value) VALUES (?, ?)',
          state.key,
          state.value
        );
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to import backup:', error);
    return { success: false, errorMsg: 'Terjadi kesalahan saat parsing atau menulis data.' };
  }
}
