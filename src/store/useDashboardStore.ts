import { create } from 'zustand';
import { logRepo, FoodLog, MealType } from '../repositories/logRepo';
import { waterRepo } from '../repositories/waterRepo';
import { activityRepo, DailyChecklistItem } from '../repositories/activityRepo';

export interface DailyTotals {
  calorie: number;
  carb_g: number;
  protein_g: number;
  fat_g: number;
}

interface DashboardStore {
  selectedDate: string;
  foodLogs: FoodLog[];
  waterIntake: number;
  checklist: DailyChecklistItem[];
  totals: DailyTotals;
  loading: boolean;

  setSelectedDate: (date: string) => void;
  loadDailyData: () => Promise<void>;
  logFood: (
    foodItemId: number | null,
    mealType: MealType,
    servingG: number,
    calorie: number,
    carbG: number,
    proteinG: number,
    fatG: number
  ) => Promise<void>;
  removeFoodLog: (logId: number) => Promise<void>;
  logWater: (amountMl: number) => Promise<void>;
  undoWaterLog: () => Promise<void>;
  toggleChecklistItem: (id: number, isDone: boolean) => Promise<void>;
  copyYesterdayLogs: (ids: number[]) => Promise<void>;
}

export const getTodayLocalDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  selectedDate: getTodayLocalDateString(),
  foodLogs: [],
  waterIntake: 0,
  checklist: [],
  totals: { calorie: 0, carb_g: 0, protein_g: 0, fat_g: 0 },
  loading: false,

  setSelectedDate: (date) => {
    set({ selectedDate: date });
    get().loadDailyData();
  },

  loadDailyData: async () => {
    const { selectedDate } = get();
    set({ loading: true });
    try {
      const foodLogs = await logRepo.getFoodLogs(selectedDate);
      const waterIntake = await waterRepo.getWaterLogsSum(selectedDate);
      const checklist = await activityRepo.getDailyChecklist(selectedDate);

      // Compute totals
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

      // Round totals to 1 decimal place
      totals.calorie = Math.round(totals.calorie);
      totals.carb_g = Math.round(totals.carb_g * 10) / 10;
      totals.protein_g = Math.round(totals.protein_g * 10) / 10;
      totals.fat_g = Math.round(totals.fat_g * 10) / 10;

      set({ foodLogs, waterIntake, checklist, totals, loading: false });
    } catch (error) {
      console.error('Failed to load daily dashboard data:', error);
      set({ loading: false });
    }
  },

  logFood: async (foodItemId, mealType, servingG, calorie, carbG, proteinG, fatG) => {
    const { selectedDate } = get();
    try {
      await logRepo.addFoodLog(foodItemId, selectedDate, mealType, servingG, calorie, carbG, proteinG, fatG);
      await get().loadDailyData();
    } catch (error) {
      console.error('Failed to log food:', error);
    }
  },

  removeFoodLog: async (logId) => {
    try {
      await logRepo.deleteFoodLog(logId);
      await get().loadDailyData();
    } catch (error) {
      console.error('Failed to delete food log:', error);
    }
  },

  logWater: async (amountMl) => {
    const { selectedDate } = get();
    try {
      await waterRepo.addWaterLog(selectedDate, amountMl);
      await get().loadDailyData();
    } catch (error) {
      console.error('Failed to log water:', error);
    }
  },

  undoWaterLog: async () => {
    const { selectedDate } = get();
    try {
      await waterRepo.removeLastWaterLog(selectedDate);
      await get().loadDailyData();
    } catch (error) {
      console.error('Failed to undo water log:', error);
    }
  },

  toggleChecklistItem: async (id, isDone) => {
    try {
      await activityRepo.toggleChecklist(id, isDone);
      await get().loadDailyData();
    } catch (error) {
      console.error('Failed to toggle checklist item:', error);
    }
  },

  copyYesterdayLogs: async (ids) => {
    const { selectedDate } = get();
    try {
      await logRepo.copyLogsToToday(ids, selectedDate);
      await get().loadDailyData();
    } catch (error) {
      console.error('Failed to copy food logs:', error);
    }
  }
}));
