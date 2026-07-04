import { calculateBmr, calculateProfileNutrition } from '../src/engine/bmrTdee';
import { calculateWaterTarget } from '../src/engine/waterCalc';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✓ Pass: ${message}`);
}

function runTests() {
  console.log('Running engine tests...');

  // Test 1: BMR Male
  // Male: 80kg, 180cm, 25 years old
  // Formula: 10 * 80 + 6.25 * 180 - 5 * 25 + 5 = 800 + 1125 - 125 + 5 = 1805
  const bmrMale = calculateBmr(80, 180, 25, 'male');
  assert(bmrMale === 1805, `BMR Male should be 1805, got ${bmrMale}`);

  // Test 2: BMR Female
  // Female: 60kg, 160cm, 30 years old
  // Formula: 10 * 60 + 6.25 * 160 - 5 * 30 - 161 = 600 + 1000 - 150 - 161 = 1289
  const bmrFemale = calculateBmr(60, 160, 30, 'female');
  assert(bmrFemale === 1289, `BMR Female should be 1289, got ${bmrFemale}`);

  // Test 3: Profile Nutrition - Maintenance (No deficit/surplus)
  // Male: 80kg, 180cm, 25 years old, sedentary, maintenance
  // BMR = 1805, TDEE = 1805 * 1.2 = 2166. Target = 2166.
  // Protein = 80 * 1.6 = 128g (512 kcal, 23.6% of calories)
  // Fat = 2166 * 0.25 / 9 = 60.17g -> rounded 60.2g (541.5 kcal)
  // Carb = (2166 - 512 - 541.5) / 4 = 1112.5 / 4 = 278.1g -> rounded 278.1g
  const profile1 = calculateProfileNutrition({
    weightKg: 80,
    heightCm: 180,
    age: 25,
    gender: 'male',
    goal: 'maintenance',
    activityLevel: 'sedentary',
  });
  
  assert(profile1.targetCalorie === 2166, `Target Calorie should be 2166, got ${profile1.targetCalorie}`);
  assert(profile1.targetProteinG === 128, `Target Protein should be 128g, got ${profile1.targetProteinG}`);
  assert(profile1.targetFatG === 60.2, `Target Fat should be 60.2g, got ${profile1.targetFatG}`);
  assert(profile1.targetCarbG === 278.1, `Target Carb should be 278.1g, got ${profile1.targetCarbG}`);

  // Test 4: Water Target Calculation
  // Formula: (BB * 33) + activity_modifier + goal_modifier
  // Weight: 80kg, sedentary (0), diet (250) -> 80 * 33 + 0 + 250 = 2640 + 250 = 2890 -> rounded to nearest 50ml -> 2900
  const waterTarget1 = calculateWaterTarget(80, 'sedentary', 'diet');
  assert(waterTarget1 === 2900, `Water target should be 2900, got ${waterTarget1}`);

  // Weight: 60kg, active (750), surplus (500) -> 60 * 33 + 750 + 500 = 1980 + 1250 = 3230 -> rounded to nearest 50ml -> 3250
  const waterTarget2 = calculateWaterTarget(60, 'active', 'surplus');
  assert(waterTarget2 === 3250, `Water target should be 3250, got ${waterTarget2}`);

  console.log('All engine tests passed successfully!');
}

runTests();
