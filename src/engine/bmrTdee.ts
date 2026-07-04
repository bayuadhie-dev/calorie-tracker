export type Gender = 'male' | 'female';
export type Goal = 'diet' | 'maintenance' | 'surplus';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export interface ProfileCalculationInput {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
  goal: Goal;
  activityLevel: ActivityLevel;
}

export interface ProfileCalculationResult {
  bmr: number;
  tdee: number;
  targetCalorie: number;
  targetCarbG: number;
  targetProteinG: number;
  targetFatG: number;
}

/**
 * Calculates BMR using the Mifflin-St Jeor Equation.
 */
export function calculateBmr(weightKg: number, heightCm: number, age: number, gender: Gender): number {
  if (gender === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }
}

/**
 * Gets the multiplier for TDEE calculation based on physical activity level.
 */
export function getActivityMultiplier(level: ActivityLevel): number {
  switch (level) {
    case 'sedentary':
      return 1.2;
    case 'light':
      return 1.375;
    case 'moderate':
      return 1.55;
    case 'active':
      return 1.725;
    case 'very_active':
      return 1.9;
    default:
      return 1.2;
  }
}

/**
 * Calculates daily caloric target and macronutrient breakdown.
 */
export function calculateProfileNutrition(input: ProfileCalculationInput): ProfileCalculationResult {
  const { weightKg, heightCm, age, gender, goal, activityLevel } = input;
  
  const bmr = calculateBmr(weightKg, heightCm, age, gender);
  const multiplier = getActivityMultiplier(activityLevel);
  const tdee = bmr * multiplier;

  // 1. Calculate Target Calorie
  let targetCalorie = tdee;
  if (goal === 'diet') {
    targetCalorie = tdee - 500;
    // Floor target calorie to 1200 kcal for safety
    if (targetCalorie < 1200) {
      targetCalorie = 1200;
    }
  } else if (goal === 'surplus') {
    targetCalorie = tdee + 300;
  }
  
  targetCalorie = Math.round(targetCalorie);

  // 2. Calculate Macros (Protein, Fat, Carb)
  // Protein (g):
  // - Diet/Surplus: 2.0g per kg of bodyweight
  // - Maintenance: 1.6g per kg of bodyweight
  let proteinMultiplier = 1.6;
  if (goal === 'diet' || goal === 'surplus') {
    proteinMultiplier = 2.0;
  }
  
  let targetProteinG = weightKg * proteinMultiplier;
  let proteinKcal = targetProteinG * 4;

  // Check if protein exceeds 35% of total calories (if so, cap at 30% of total calories)
  if (proteinKcal > targetCalorie * 0.35) {
    targetProteinG = (targetCalorie * 0.30) / 4;
    proteinKcal = targetProteinG * 4;
  }

  // Fat (g): 25% of target calories
  const fatKcal = targetCalorie * 0.25;
  let targetFatG = fatKcal / 9;

  // Carb (g): Remainder of calories
  const carbKcal = targetCalorie - proteinKcal - fatKcal;
  let targetCarbG = carbKcal / 4;

  // Final rounding to 1 decimal place
  return {
    bmr: Math.round(bmr * 10) / 10,
    tdee: Math.round(tdee * 10) / 10,
    targetCalorie: Math.round(targetCalorie),
    targetCarbG: Math.round(targetCarbG * 10) / 10,
    targetProteinG: Math.round(targetProteinG * 10) / 10,
    targetFatG: Math.round(targetFatG * 10) / 10,
  };
}
