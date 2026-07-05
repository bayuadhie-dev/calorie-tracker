export interface WeightProjection {
  averageDailyDeficit: number; // positive for deficit, negative for surplus
  remainingKg: number;
  estimatedDays: number;
  estimatedDate: string; // 'YYYY-MM-DD'
  isOnTrack: boolean;
}

export interface DailyHistoryRecord {
  log_date: string;
  total_calorie: number;
  target_calorie: number;
}

/**
 * Calculates weight projection based on past 7 days of calorie history.
 * Pure function, testable without database.
 */
export function calculateWeightProjection(
  currentWeight: number,
  targetWeight: number,
  goal: 'diet' | 'maintenance' | 'surplus',
  history: DailyHistoryRecord[],
  todayStr: string // Pass today's date for relative date calculation
): WeightProjection {
  const remainingKg = Math.abs(currentWeight - targetWeight);

  // If already reached target or goal is maintenance
  if (remainingKg <= 0.1) {
    return {
      averageDailyDeficit: 0,
      remainingKg: 0,
      estimatedDays: 0,
      estimatedDate: todayStr,
      isOnTrack: true
    };
  }

  if (goal === 'maintenance') {
    return {
      averageDailyDeficit: 0,
      remainingKg,
      estimatedDays: 0,
      estimatedDate: todayStr,
      isOnTrack: true
    };
  }

  // Calculate average daily deficit or surplus over the available history (up to 7 days)
  if (history.length === 0) {
    return {
      averageDailyDeficit: 0,
      remainingKg,
      estimatedDays: -1,
      estimatedDate: '',
      isOnTrack: false
    };
  }

  let totalDeficit = 0;
  for (const record of history) {
    totalDeficit += (record.target_calorie - record.total_calorie);
  }
  const averageDailyDeficit = totalDeficit / history.length;

  let estimatedDays = -1;
  let isOnTrack = false;
  let estimatedDate = '';

  if (goal === 'diet') {
    // We want a positive deficit (eating less than target) to lose weight
    if (averageDailyDeficit > 0) {
      estimatedDays = Math.ceil((remainingKg * 7700) / averageDailyDeficit);
      isOnTrack = true;
    }
  } else if (goal === 'surplus') {
    // We want a negative deficit (eating more than target, i.e., surplus) to gain weight
    const averageDailySurplus = -averageDailyDeficit;
    if (averageDailySurplus > 0) {
      estimatedDays = Math.ceil((remainingKg * 7700) / averageDailySurplus);
      isOnTrack = true;
    }
  }

  if (isOnTrack && estimatedDays >= 0) {
    const today = new Date(todayStr);
    today.setDate(today.getDate() + estimatedDays);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    estimatedDate = `${year}-${month}-${day}`;
  }

  return {
    averageDailyDeficit,
    remainingKg,
    estimatedDays,
    estimatedDate,
    isOnTrack
  };
}
