import { create } from 'zustand';
import { userProfileRepo, UserProfile } from '../repositories/userProfileRepo';
import { calculateProfileNutrition } from '../engine/bmrTdee';
import { calculateWaterTarget } from '../engine/waterCalc';
import { initDb } from '../db/client';

interface OnboardingTempData {
  weight_kg?: number;
  target_weight_kg?: number;
  height_cm?: number;
  age?: number;
  gender?: 'male' | 'female';
  goal?: 'diet' | 'maintenance' | 'surplus';
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  restrictionTagIds?: number[];
}

interface ProfileStore {
  profile: UserProfile | null;
  restrictionTagIds: number[];
  loading: boolean;
  onboardingTemp: OnboardingTempData;
  dbInitialized: boolean;
  
  initDatabase: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateOnboardingTemp: (data: OnboardingTempData) => void;
  saveProfileFromOnboarding: () => Promise<void>;
  resetProfile: () => Promise<void>;
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profile: null,
  restrictionTagIds: [],
  loading: true,
  onboardingTemp: {
    restrictionTagIds: [],
  },
  dbInitialized: false,

  initDatabase: async () => {
    try {
      await initDb();
      await get().fetchProfile();
      set({ dbInitialized: true });
    } catch (error) {
      console.error('Database initialization failed:', error);
      set({ dbInitialized: false, loading: false });
    }
  },

  fetchProfile: async () => {
    set({ loading: true });
    try {
      const profile = await userProfileRepo.getUserProfile();
      const restrictionTagIds = profile ? await userProfileRepo.getFoodRestrictions() : [];
      set({ profile, restrictionTagIds, loading: false });
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      set({ loading: false });
    }
  },

  updateOnboardingTemp: (data) => {
    set((state) => ({
      onboardingTemp: { ...state.onboardingTemp, ...data },
    }));
  },

  saveProfileFromOnboarding: async () => {
    const { onboardingTemp } = get();
    const { weight_kg, target_weight_kg, height_cm, age, gender, goal, activity_level, restrictionTagIds = [] } = onboardingTemp;

    if (!weight_kg || !target_weight_kg || !height_cm || !age || !gender || !goal || !activity_level) {
      throw new Error('Onboarding data is incomplete.');
    }

    set({ loading: true });
    try {
      // 1. Calculate BMR, TDEE, Macros
      const nutrition = calculateProfileNutrition({
        weightKg: weight_kg,
        heightCm: height_cm,
        age: age,
        gender: gender,
        goal: goal,
        activityLevel: activity_level,
      });

      // 2. Calculate Water Target
      const waterTarget = calculateWaterTarget(weight_kg, activity_level, goal);

      // 3. Build full profile object
      const fullProfile: UserProfile = {
        weight_kg,
        target_weight_kg,
        height_cm,
        age,
        gender,
        goal,
        activity_level,
        bmr: nutrition.bmr,
        tdee: nutrition.tdee,
        target_calorie: nutrition.targetCalorie,
        target_carb_g: nutrition.targetCarbG,
        target_protein_g: nutrition.targetProteinG,
        target_fat_g: nutrition.targetFatG,
        target_water_ml: waterTarget,
      };

      // 4. Save to Repository
      await userProfileRepo.saveUserProfile(fullProfile);
      await userProfileRepo.saveFoodRestrictions(restrictionTagIds);

      // 5. Update Zustand state
      set({
        profile: fullProfile,
        restrictionTagIds,
        loading: false,
        onboardingTemp: { restrictionTagIds: [] }, // Clear temp data
      });
    } catch (error) {
      console.error('Failed to save profile from onboarding:', error);
      set({ loading: false });
      throw error;
    }
  },

  resetProfile: async () => {
    // Used for testing/resetting app
    set({ profile: null, restrictionTagIds: [], onboardingTemp: { restrictionTagIds: [] } });
  },
}));
