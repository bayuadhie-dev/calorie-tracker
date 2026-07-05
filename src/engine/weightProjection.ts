export interface WeightProjection {
  averageDailyDeficit: number; // Blended deficit
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
 * Calculates weight projection based on past 7 days of calorie history and BMR/TDEE expectation.
 * Hybrid Model: Blends expected daily deficit with actual daily deficit.
 * Pure function, testable without database.
 */
export function calculateWeightProjection(
  currentWeight: number,
  targetWeight: number,
  goal: 'diet' | 'maintenance' | 'surplus',
  history: DailyHistoryRecord[],
  tdee: number,
  targetCalorie: number,
  todayStr: string
): WeightProjection {
  const remainingKg = Math.abs(currentWeight - targetWeight);

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

  // 1. Calculate expected daily deficit/surplus from TDEE vs Target Calorie
  const expectedDailyDeficit = tdee - targetCalorie;

  // 2. Calculate actual average daily deficit from history
  let actualAverageDeficit = 0;
  if (history.length > 0) {
    let totalDeficit = 0;
    for (const record of history) {
      totalDeficit += (record.target_calorie - record.total_calorie);
    }
    actualAverageDeficit = totalDeficit / history.length;
  }

  // 3. Blend expected and actual based on history length (0 to 7 days)
  // If 0 days of logs: 100% expected, 0% actual
  // If 7+ days of logs: 0% expected, 100% actual
  const actualWeight = Math.min(1.0, history.length / 7);
  const expectedWeight = 1.0 - actualWeight;
  const blendedDeficit = (actualAverageDeficit * actualWeight) + (expectedDailyDeficit * expectedWeight);

  let estimatedDays = -1;
  let isOnTrack = false;
  let estimatedDate = '';

  if (goal === 'diet') {
    // We want a positive deficit (eating less than TDEE) to lose weight
    if (blendedDeficit > 0) {
      estimatedDays = Math.ceil((remainingKg * 7700) / blendedDeficit);
      isOnTrack = true;
    }
  } else if (goal === 'surplus') {
    // We want a negative deficit (eating more than TDEE, i.e., surplus) to gain weight
    const blendedSurplus = -blendedDeficit;
    if (blendedSurplus > 0) {
      estimatedDays = Math.ceil((remainingKg * 7700) / blendedSurplus);
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
    averageDailyDeficit: blendedDeficit,
    remainingKg,
    estimatedDays,
    estimatedDate,
    isOnTrack
  };
}
