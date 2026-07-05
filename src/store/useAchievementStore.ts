import { create } from 'zustand';
import { achievementRepo, AchievementDefinition, UserAchievement } from '../repositories/achievementRepo';
import { checkAchievementsToUnlock, AchievementEvaluationParams } from '../engine/achievementEngine';
import { userProfileRepo } from '../repositories/userProfileRepo';
import { getDb } from '../db/client';
import { Audio } from 'expo-av';
import { useSettingsStore } from './useSettingsStore';

// Load levelup sound asset statically to play in store if needed,
// or we can let the Toast component handle playing it via useSfx.
// Since stores are vanilla JS/TS, we can play sounds using Audio.Sound.createAsync directly.
const LEVEL_UP_SFX = require('../../assets/sfx/levelup.wav');

interface AchievementStore {
  definitions: AchievementDefinition[];
  unlocked: UserAchievement[];
  activeToast: { code: string; label: string; description: string } | null;
  loading: boolean;

  fetchAchievements: () => Promise<void>;
  checkAndUnlock: (currentWeightKg?: number) => Promise<void>;
  triggerToast: (code: string, label: string, description: string) => void;
  clearToast: () => void;
}

export const useAchievementStore = create<AchievementStore>((set, get) => ({
  definitions: [],
  unlocked: [],
  activeToast: null,
  loading: false,

  fetchAchievements: async () => {
    set({ loading: true });
    try {
      const definitions = await achievementRepo.getDefinitions();
      const unlocked = await achievementRepo.getUnlocked();
      set({ definitions, unlocked, loading: false });
    } catch (err) {
      console.error('Failed to fetch achievements:', err);
      set({ loading: false });
    }
  },

  checkAndUnlock: async (currentWeightKg?: number) => {
    try {
      const db = await getDb();
      
      // 1. Fetch user profile
      const profile = await userProfileRepo.getUserProfile();
      if (!profile) return;

      const weight = currentWeightKg !== undefined ? currentWeightKg : profile.weight_kg;

      // 2. Fetch streaks from app_state
      const foodStreakRow = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_state WHERE key = 'active_food_log_streak'");
      const foodStreak = foodStreakRow ? parseInt(foodStreakRow.value, 10) : 0;

      const waterStreakRow = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_state WHERE key = 'active_water_streak'");
      const waterStreak = waterStreakRow ? parseInt(waterStreakRow.value, 10) : 0;

      const weighInStreakRow = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_state WHERE key = 'weigh_in_streak'");
      const weighInStreak = weighInStreakRow ? parseInt(weighInStreakRow.value, 10) : 0;

      // 3. Fetch total weight log count
      const weightLogCountRow = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM weight_logs");
      const weightLogCount = weightLogCountRow ? weightLogCountRow.count : 0;

      // 4. Fetch already unlocked codes
      const unlocked = await achievementRepo.getUnlocked();
      const unlockedCodes = unlocked.map((u) => u.achievement_code);

      // 5. Build params and evaluate
      const params: AchievementEvaluationParams = {
        startWeightKg: profile.start_weight_kg || profile.weight_kg,
        currentWeightKg: weight,
        targetWeightKg: profile.target_weight_kg,
        goal: profile.goal,
        unlockedCodes,
        foodLogStreak: foodStreak,
        waterStreak: waterStreak,
        weightLogCount,
        weighInOnTimeStreak: weighInStreak
      };

      const codesToUnlock = checkAchievementsToUnlock(params);

      if (codesToUnlock.length > 0) {
        // Fetch definitions to get labels & descriptions
        const definitions = await achievementRepo.getDefinitions();
        const defMap = new Map<string, AchievementDefinition>();
        definitions.forEach((d) => defMap.set(d.code, d));

        for (const code of codesToUnlock) {
          const success = await achievementRepo.unlock(code, weight);
          if (success) {
            const def = defMap.get(code);
            if (def) {
              // Trigger toast and play sound effects
              get().triggerToast(code, def.label, def.description);
            }
          }
        }

        // Refresh unlocked list
        const updatedUnlocked = await achievementRepo.getUnlocked();
        set({ unlocked: updatedUnlocked });
      }
    } catch (err) {
      console.error('Failed checking achievements:', err);
    }
  },

  triggerToast: async (code, label, description) => {
    set({ activeToast: { code, label, description } });

    // Play level up sound directly from store
    const { soundEffectsEnabled } = useSettingsStore.getState();
    if (soundEffectsEnabled) {
      try {
        const { sound } = await Audio.Sound.createAsync(
          LEVEL_UP_SFX,
          { shouldPlay: true }
        );
        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync().catch(() => {});
          }
        });
      } catch (err) {
        console.log('Failed to play levelup sound in store:', err);
      }
    }
  },

  clearToast: () => {
    set({ activeToast: null });
  }
}));
