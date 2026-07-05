export interface MacroHistoryRecord {
  total_carb_g: number;
  total_protein_g: number;
  total_fat_g: number;
}

export interface MacroInsightResult {
  carbInsight: string;
  proteinInsight: string;
  fatInsight: string;
  averages: {
    carb: number;
    protein: number;
    fat: number;
  };
  percentages: {
    carb: number;
    protein: number;
    fat: number;
  };
}

/**
 * Pure function to evaluate weekly macro intake trends and generate insights.
 * Testable without database.
 */
export function generateMacroInsight(
  targetCarb: number,
  targetProtein: number,
  targetFat: number,
  history: MacroHistoryRecord[]
): MacroInsightResult {
  // Defaults if no target
  const tc = targetCarb || 250;
  const tp = targetProtein || 100;
  const tf = targetFat || 65;

  if (history.length === 0) {
    return {
      carbInsight: 'Butuh lebih banyak data log untuk analisis karbohidrat.',
      proteinInsight: 'Butuh lebih banyak data log untuk analisis protein.',
      fatInsight: 'Butuh lebih banyak data log untuk analisis lemak.',
      averages: { carb: 0, protein: 0, fat: 0 },
      percentages: { carb: 0, protein: 0, fat: 0 }
    };
  }

  // Calculate averages
  let sumCarb = 0;
  let sumProt = 0;
  let sumFat = 0;

  for (const r of history) {
    sumCarb += r.total_carb_g;
    sumProt += r.total_protein_g;
    sumFat += r.total_fat_g;
  }

  const avgCarb = sumCarb / history.length;
  const avgProt = sumProt / history.length;
  const avgFat = sumFat / history.length;

  const pctCarb = Math.round((avgCarb / tc) * 100);
  const pctProt = Math.round((avgProt / tp) * 100);
  const pctFat = Math.round((avgFat / tf) * 100);

  // Generate Insights
  let carbInsight = '';
  if (pctCarb < 70) {
    carbInsight = `Karbohidrat kamu rata-rata hanya ${pctCarb}% dari target — coba tambah nasi, oatmeal, atau ubi untuk energi harian.`;
  } else if (pctCarb > 110) {
    carbInsight = `Karbohidrat kamu berlebih (${pctCarb}% dari target) — kurangi makanan manis atau porsi nasi berlebih.`;
  } else {
    carbInsight = `Karbohidrat kamu rata-rata ${pctCarb}% (On Track) — pertahankan pilihan sumber energi kompleks Anda!`;
  }

  let proteinInsight = '';
  if (pctProt < 70) {
    proteinInsight = `Protein kamu rata-rata hanya ${pctProt}% dari target — coba tambah konsumsi telur, ayam, tahu, tempe, atau daging sapi.`;
  } else if (pctProt > 110) {
    proteinInsight = `Protein kamu tinggi (${pctProt}% dari target) — asupan yang bagus untuk pemulihan otot harian Anda!`;
  } else {
    proteinInsight = `Protein kamu rata-rata ${pctProt}% (On Track) — pertahankan asupan makro pembangun otot ini!`;
  }

  let fatInsight = '';
  if (pctFat < 70) {
    fatInsight = `Lemak kamu rata-rata hanya ${pctFat}% dari target — tambahkan lemak sehat dari alpukat, telur, atau kacang-kacangan.`;
  } else if (pctFat > 110) {
    fatInsight = `Lemak kamu berlebih (${pctFat}% dari target) — kurangi gorengan atau masakan bersantan berlebih.`;
  } else {
    fatInsight = `Lemak kamu rata-rata ${pctFat}% (On Track) — keseimbangan lemak sehat harian Anda sudah baik!`;
  }

  return {
    carbInsight,
    proteinInsight,
    fatInsight,
    averages: {
      carb: Math.round(avgCarb * 10) / 10,
      protein: Math.round(avgProt * 10) / 10,
      fat: Math.round(avgFat * 10) / 10
    },
    percentages: {
      carb: pctCarb,
      protein: pctProt,
      fat: pctFat
    }
  };
}
