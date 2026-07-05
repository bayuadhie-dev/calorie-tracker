import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useDashboardStore } from '../../src/store/useDashboardStore';
import { useProfileStore } from '../../src/store/useProfileStore';
import { foodRepo, FoodItem, FoodPortion } from '../../src/repositories/foodRepo';
import { MealType, FoodLog, logRepo } from '../../src/repositories/logRepo';
import { suggestMealsForSlot, FoodItemSuggest } from '../../src/engine/mealSuggest';
import { mealPlannerRepo } from '../../src/repositories/mealPlannerRepo';
import PixelButton from '../../src/components/ui/PixelButton';
import PixelCard from '../../src/components/ui/PixelCard';
import { useSfx } from '../../src/hooks/useSfx';

type SubView = 'meals' | 'search' | 'custom_food' | 'copy_yesterday';

export default function MealPlanner() {
  const { profile, restrictionTagIds, preferenceTagIds } = useProfileStore();
  const { foodLogs, logFood, removeFoodLog, copyYesterdayLogs } = useDashboardStore();
  const { playSfx } = useSfx();

  const [currentView, setCurrentView] = useState<SubView>('meals');
  const [activeMealType, setActiveMealType] = useState<MealType>('breakfast');

  // Suggest Candidates State
  const [candidates, setCandidates] = useState<FoodItemSuggest[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(true);

  // Search View State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [portions, setPortions] = useState<FoodPortion[]>([]);
  const [selectedPortionIndex, setSelectedPortionIndex] = useState<number>(0);
  const [quantity, setQuantity] = useState('1');
  const [customGrams, setCustomGrams] = useState('100');

  // Custom Food State
  const [customName, setCustomName] = useState('');
  const [customCal, setCustomCal] = useState('');
  const [customCarb, setCustomCarb] = useState('');
  const [customProt, setCustomProt] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [customPortionLabel, setCustomPortionLabel] = useState('');
  const [customPortionGrams, setCustomPortionGrams] = useState('');
  const [customError, setCustomError] = useState('');

  // Copy Yesterday State
  const [yesterdayLogs, setYesterdayLogs] = useState<FoodLog[]>([]);
  const [selectedYesterdayIds, setSelectedYesterdayIds] = useState<number[]>([]);
  const [loadingYesterday, setLoadingYesterday] = useState(false);

  // Load food candidates for suggestion engine on mount
  useEffect(() => {
    async function loadCandidates() {
      try {
        const data = await mealPlannerRepo.getFoodCandidates();
        setCandidates(data);
      } catch (err) {
        console.error('Failed to load food candidates for suggest:', err);
      } finally {
        setLoadingCandidates(false);
      }
    }
    loadCandidates();
  }, [foodLogs]); // Reload when logs change so we have fresh state

  // Search foods when search query changes
  useEffect(() => {
    if (currentView !== 'search') return;
    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      return;
    }
    
    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await foodRepo.searchFoods(searchQuery, restrictionTagIds);
        setSearchResults(results);
      } catch (err) {
        console.error('Failed to search foods:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, currentView, restrictionTagIds]);

  const getYesterdayDateString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Load portions when a food is selected
  const handleSelectFood = async (food: FoodItem) => {
    playSfx('beep');
    setSelectedFood(food);
    setSelectedPortionIndex(0);
    setQuantity('1');
    setCustomGrams('100');
    try {
      const data = await foodRepo.getFoodPortions(food.id);
      setPortions(data);
    } catch (err) {
      console.error('Failed to get food portions:', err);
      setPortions([]);
    }
  };

  // Log food from search view
  const handleAddLog = async () => {
    if (!selectedFood) return;

    let grams = 100;
    const qty = parseFloat(quantity) || 1;

    // Check portion unit
    if (portions.length > 0 && selectedPortionIndex < portions.length) {
      const selectedPortion = portions[selectedPortionIndex];
      grams = selectedPortion.grams_equivalent * qty;
    } else {
      // Input in grams directly
      grams = parseFloat(customGrams) || 100;
    }

    const factor = grams / 100;
    const cal = selectedFood.calorie_per_100g * factor;
    const carb = selectedFood.carb_g * factor;
    const prot = selectedFood.protein_g * factor;
    const fat = selectedFood.fat_g * factor;

    await logFood(selectedFood.id, activeMealType, grams, cal, carb, prot, fat);
    playSfx('blip');
    
    // Reset and return
    handleBackToMeals();
  };

  // Save and Log Custom Food
  const handleSaveCustomFood = async () => {
    setCustomError('');
    if (!customName.trim()) {
      setCustomError('NAMA MAKANAN HARUS DIISI!');
      return;
    }
    const cal = parseFloat(customCal);
    const carb = parseFloat(customCarb);
    const prot = parseFloat(customProt);
    const fat = parseFloat(customFat);

    if (isNaN(cal) || cal < 0 || isNaN(carb) || carb < 0 || isNaN(prot) || prot < 0 || isNaN(fat) || fat < 0) {
      setCustomError('NILAI GIZI HARUS VALID (ANGKA >= 0)!');
      return;
    }

    try {
      const kPortions = [];
      if (customPortionLabel.trim() && parseFloat(customPortionGrams) > 0) {
        kPortions.push({
          unit_label: customPortionLabel.trim().toLowerCase(),
          grams_equivalent: parseFloat(customPortionGrams),
        });
      }

      // Add to database
      const newFoodId = await foodRepo.addCustomFood(
        customName.trim(),
        cal,
        carb,
        prot,
        fat,
        kPortions
      );

      // Log immediately for today
      const grams = kPortions.length > 0 ? kPortions[0].grams_equivalent : 100;
      const factor = grams / 100;

      await logFood(newFoodId, activeMealType, grams, cal * factor, carb * factor, prot * factor, fat * factor);
      playSfx('blip');

      // Clear state and return
      setCustomName('');
      setCustomCal('');
      setCustomCarb('');
      setCustomProt('');
      setCustomFat('');
      setCustomPortionLabel('');
      setCustomPortionGrams('');
      handleBackToMeals();
    } catch (err) {
      console.error(err);
      setCustomError('GAGAL MENYIMPAN MAKANAN KUSTOM.');
    }
  };

  const handleOpenCopyYesterday = async () => {
    playSfx('beep');
    setLoadingYesterday(true);
    setCurrentView('copy_yesterday');
    setSelectedYesterdayIds([]);
    try {
      const yDate = getYesterdayDateString();
      const logs = await logRepo.getYesterdayLogs(yDate);
      setYesterdayLogs(logs);
    } catch (err) {
      console.error('Failed to load yesterday logs:', err);
      setYesterdayLogs([]);
    } finally {
      setLoadingYesterday(false);
    }
  };

  const toggleYesterdaySelection = (id: number) => {
    playSfx('beep');
    setSelectedYesterdayIds((prev) =>
      prev.includes(id) ? prev.filter((yId) => yId !== id) : [...prev, id]
    );
  };

  const handleExecuteCopy = async () => {
    if (selectedYesterdayIds.length === 0) return;
    setLoadingYesterday(true);
    try {
      await copyYesterdayLogs(selectedYesterdayIds);
      playSfx('blip');
      setCurrentView('meals');
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingYesterday(false);
    }
  };

  const handleBackToMeals = () => {
    setSelectedFood(null);
    setSearchQuery('');
    setSearchResults([]);
    setCurrentView('meals');
  };

  const calculateLiveNutrition = () => {
    if (!selectedFood) return { cal: 0, carb: 0, prot: 0, fat: 0 };
    let grams = 100;
    const qty = parseFloat(quantity) || 1;

    if (portions.length > 0 && selectedPortionIndex < portions.length) {
      grams = portions[selectedPortionIndex].grams_equivalent * qty;
    } else {
      grams = parseFloat(customGrams) || 100;
    }

    const factor = grams / 100;
    return {
      cal: Math.round(selectedFood.calorie_per_100g * factor),
      carb: Math.round(selectedFood.carb_g * factor * 10) / 10,
      prot: Math.round(selectedFood.protein_g * factor * 10) / 10,
      fat: Math.round(selectedFood.fat_g * factor * 10) / 10,
      grams: Math.round(grams),
    };
  };

  const renderMealsView = () => {
    const mealTypes: { type: MealType; label: string }[] = [
      { type: 'breakfast', label: 'SARAPAN PAGI' },
      { type: 'lunch', label: 'MAKAN SIANG' },
      { type: 'dinner', label: 'MAKAN MALAM' },
      { type: 'snack', label: 'CEMILAN' },
    ];

    return (
      <View style={styles.mealsContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>MEAL PLANNER</Text>
          <PixelButton
            style={styles.copyBtn}
            onPress={handleOpenCopyYesterday}
          >
            📋 SALIN KEMARIN
          </PixelButton>
        </View>

        {mealTypes.map((mt) => {
          const logs = foodLogs.filter((log) => log.meal_type === mt.type);
          const mealCalorie = logs.reduce((sum, item) => sum + item.calorie, 0);

          return (
            <PixelCard key={mt.type} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <View>
                  <Text style={styles.mealLabel}>{mt.label}</Text>
                  <Text style={styles.mealCalSum}>{Math.round(mealCalorie)} KCAL</Text>
                </View>
                <PixelButton
                  style={styles.addFoodBtn}
                  onPress={() => {
                    setActiveMealType(mt.type);
                    setCurrentView('search');
                  }}
                >
                  + CATAT
                </PixelButton>
              </View>

              <View style={styles.logList}>
                {logs.length === 0 ? (
                  <Text style={styles.emptyLogText}>BELUM ADA MAKANAN DICATAT.</Text>
                ) : (
                  logs.map((log) => (
                    <View key={log.id} style={styles.logItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.logFoodName}>
                          {log.food_name?.toUpperCase() || 'MAKANAN'}
                        </Text>
                        <Text style={styles.logFoodGrams}>
                          {Math.round(log.serving_g)}G • {Math.round(log.calorie)} KCAL
                        </Text>
                      </View>
                      <PixelButton
                        variant="danger"
                        style={styles.deleteLogBtn}
                        onPress={() => removeFoodLog(log.id)}
                      >
                        X
                      </PixelButton>
                    </View>
                  ))
                )}
              </View>
            </PixelCard>
          );
        })}
      </View>
    );
  };

  const renderSearchView = () => {
    const liveNut = calculateLiveNutrition();

    // Calculate auto suggestions if searchQuery is empty and no food selected
    let suggestions: FoodItemSuggest[] = [];
    let isSlotFulfilled = false;
    let slotTargetCal = 0;
    let slotCurrentCal = 0;

    if (searchQuery.trim().length === 0 && !selectedFood && profile) {
      let slotRatio = 0.25;
      if (activeMealType === 'lunch') slotRatio = 0.35;
      else if (activeMealType === 'dinner') slotRatio = 0.30;
      else if (activeMealType === 'snack') slotRatio = 0.10;

      slotTargetCal = (profile.target_calorie || 2000) * slotRatio;
      slotCurrentCal = foodLogs
        .filter((l) => l.meal_type === activeMealType)
        .reduce((sum, item) => sum + item.calorie, 0);

      isSlotFulfilled = slotTargetCal - slotCurrentCal <= 0;

      if (!isSlotFulfilled && candidates.length > 0) {
        suggestions = suggestMealsForSlot(
          activeMealType,
          profile.target_calorie || 2000,
          candidates,
          restrictionTagIds,
          preferenceTagIds
        );
      }
    }

    return (
      <View style={styles.searchContainer}>
        <View style={styles.searchHeader}>
          <PixelButton style={styles.backBtn} onPress={handleBackToMeals}>
            {"<- KEMBALI"}
          </PixelButton>
          <Text style={styles.searchTitle}>CATAT {activeMealType.toUpperCase()}</Text>
        </View>

        {selectedFood ? (
          /* Portion Selection View */
          <PixelCard style={styles.portionCard}>
            <Text style={styles.selectedFoodName}>{selectedFood.name.toUpperCase()}</Text>
            <Text style={styles.selectedFoodGizi}>
              (PER 100G: {selectedFood.calorie_per_100g} KCAL • C {selectedFood.carb_g}G • P {selectedFood.protein_g}G • L {selectedFood.fat_g}G)
            </Text>

            <View style={styles.portionOptions}>
              <Text style={styles.inputLabel}>PILIH PORSI:</Text>
              
              {portions.map((p, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => setSelectedPortionIndex(idx)}
                  style={styles.portionOptionPressable}
                >
                  <Text style={[styles.portionOptionText, selectedPortionIndex === idx ? styles.activePortionText : null]}>
                    {selectedPortionIndex === idx ? '[X] ' : '[ ] '}
                    {p.unit_label.toUpperCase()} ({p.grams_equivalent}G)
                  </Text>
                </Pressable>
              ))}

              <Pressable
                onPress={() => setSelectedPortionIndex(portions.length)}
                style={styles.portionOptionPressable}
              >
                <Text style={[styles.portionOptionText, selectedPortionIndex === portions.length ? styles.activePortionText : null]}>
                  {selectedPortionIndex === portions.length ? '[X] ' : '[ ] '}
                  INPUT DALAM GRAM LANGSUNG
                </Text>
              </Pressable>
            </View>

            {selectedPortionIndex === portions.length ? (
              <View style={styles.qtyRow}>
                <Text style={styles.qtyLabel}>JUMLAH GRAM:</Text>
                <TextInput
                  style={styles.qtyInput}
                  keyboardType="numeric"
                  value={customGrams}
                  onChangeText={(val) => setCustomGrams(val.replace(/[^0-9.]/g, ''))}
                />
              </View>
            ) : (
              <View style={styles.qtyRow}>
                <Text style={styles.qtyLabel}>JUMLAH PORSI:</Text>
                <TextInput
                  style={styles.qtyInput}
                  keyboardType="numeric"
                  value={quantity}
                  onChangeText={(val) => setQuantity(val.replace(/[^0-9.]/g, ''))}
                />
              </View>
            )}

            <View style={styles.liveCalculationBox}>
              <Text style={styles.liveCalTitle}>ESTIMASI GIZI LOG:</Text>
              <Text style={styles.liveCalVal}>{liveNut.grams} GRAM • {liveNut.cal} KCAL</Text>
              <Text style={styles.liveMacrosVal}>
                C {liveNut.carb}G • P {liveNut.prot}G • L {liveNut.fat}G
              </Text>
            </View>

            <View style={styles.portionButtons}>
              <PixelButton style={{ flex: 1 }} onPress={handleAddLog}>
                CATAT MAKAN
              </PixelButton>
              <View style={{ width: 10 }} />
              <PixelButton variant="secondary" style={{ flex: 1 }} onPress={() => setSelectedFood(null)}>
                BATAL
              </PixelButton>
            </View>
          </PixelCard>
        ) : (
          /* Food Search Results View */
          <>
            <View style={styles.searchBarRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="CARI MAKANAN (MISAL: TELUR)..."
                placeholderTextColor="#888888"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <PixelButton
              variant="secondary"
              style={styles.customFoodRedirectBtn}
              onPress={() => setCurrentView('custom_food')}
            >
              + BUAT MAKANAN KUSTOM BARU
            </PixelButton>

            {/* Display Auto Suggest Recommendations */}
            {searchQuery.trim().length === 0 && (
              <View style={styles.suggestSection}>
                <Text style={styles.suggestHeader}>👾 REKOMENDASI UNTUK {activeMealType.toUpperCase()}:</Text>
                {isSlotFulfilled ? (
                  <PixelCard style={styles.suggestMsgCard} innerStyle={{ padding: 12 }}>
                    <Text style={styles.suggestMsgText}>SLOT INI SUDAH TERPENUHI harian.</Text>
                  </PixelCard>
                ) : loadingCandidates ? (
                  <ActivityIndicator size="small" color="#000000" style={{ marginTop: 12 }} />
                ) : suggestions.length === 0 ? (
                  <Text style={styles.noResultsText}>BELUM ADA DATA REKOMENDASI.</Text>
                ) : (
                  <View style={styles.suggestList}>
                    {suggestions.map((food) => (
                      <Pressable
                        key={food.id}
                        onPress={() => handleSelectFood(food as any)}
                        style={styles.searchResultItem}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.searchResultName}>{food.name.toUpperCase()}</Text>
                          <Text style={styles.searchResultCal}>
                            {food.calorie_per_100g} KCAL/100G
                          </Text>
                        </View>
                        <Text style={styles.tapText}>{"+"}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}

            {searchQuery.trim().length > 0 && (
              searching ? (
                <ActivityIndicator size="large" color="#000000" style={{ marginTop: 24 }} />
              ) : (
                <ScrollView style={styles.searchResultsScroll}>
                  {searchResults.length === 0 ? (
                    <Text style={styles.noResultsText}>MAKANAN TIDAK DITEMUKAN.</Text>
                  ) : (
                    searchResults.map((food) => (
                      <Pressable
                        key={food.id}
                        onPress={() => handleSelectFood(food)}
                        style={styles.searchResultItem}
                      >
                        <Text style={styles.searchResultName}>
                          {food.name.toUpperCase()}
                        </Text>
                        <Text style={styles.searchResultCal}>
                          {food.calorie_per_100g} KCAL / 100G
                        </Text>
                      </Pressable>
                    ))
                  )}
                </ScrollView>
              )
            )}
          </>
        )}
      </View>
    );
  };

  const renderCustomFoodView = () => {
    return (
      <View style={styles.customContainer}>
        <View style={styles.searchHeader}>
          <PixelButton style={styles.backBtn} onPress={() => setCurrentView('search')}>
            {"<- KEMBALI"}
          </PixelButton>
          <Text style={styles.searchTitle}>MAKANAN KUSTOM</Text>
        </View>

        {customError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>* {customError} *</Text>
          </View>
        ) : null}

        <PixelCard style={styles.customCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>NAMA MAKANAN:</Text>
            <TextInput
              style={styles.input}
              placeholder="MISAL: INDOMIE REBUS TELUR"
              placeholderTextColor="#888888"
              value={customName}
              onChangeText={setCustomName}
            />
          </View>

          <View style={styles.giziGrid}>
            <View style={styles.giziGridCol}>
              <Text style={styles.label}>KALORI (KCAL/100G):</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="350"
                placeholderTextColor="#888888"
                value={customCal}
                onChangeText={(val) => setCustomCal(val.replace(/[^0-9.]/g, ''))}
              />
            </View>
            <View style={styles.giziGridCol}>
              <Text style={styles.label}>KARBO (G/100G):</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="40"
                placeholderTextColor="#888888"
                value={customCarb}
                onChangeText={(val) => setCustomCarb(val.replace(/[^0-9.]/g, ''))}
              />
            </View>
          </View>

          <View style={styles.giziGrid}>
            <View style={styles.giziGridCol}>
              <Text style={styles.label}>PROTEIN (G/100G):</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="10"
                placeholderTextColor="#888888"
                value={customProt}
                onChangeText={(val) => setCustomProt(val.replace(/[^0-9.]/g, ''))}
              />
            </View>
            <View style={styles.giziGridCol}>
              <Text style={styles.label}>LEMAK (G/100G):</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="8"
                placeholderTextColor="#888888"
                value={customFat}
                onChangeText={(val) => setCustomFat(val.replace(/[^0-9.]/g, ''))}
              />
            </View>
          </View>

          <Text style={styles.portionHeading}>PENGATURAN PORSI BAWAAN (OPSIONAL):</Text>

          <View style={styles.giziGrid}>
            <View style={{ flex: 2, marginRight: 8 }}>
              <Text style={styles.label}>NAMA PORSI (MISAL: 1 BUNGKUS):</Text>
              <TextInput
                style={styles.input}
                placeholder="bungkus"
                placeholderTextColor="#888888"
                value={customPortionLabel}
                onChangeText={setCustomPortionLabel}
              />
            </View>
            <View style={{ flex: 1.2 }}>
              <Text style={styles.label}>BERAT PORSI (GRAM):</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="85"
                placeholderTextColor="#888888"
                value={customPortionGrams}
                onChangeText={(val) => setCustomPortionGrams(val.replace(/[^0-9.]/g, ''))}
              />
            </View>
          </View>

          <PixelButton style={{ marginTop: 8 }} onPress={handleSaveCustomFood}>
            SIMPAN & CATAT MAKANAN
          </PixelButton>
        </PixelCard>
      </View>
    );
  };

  const renderCopyYesterdayView = () => {
    return (
      <View style={styles.copyContainer}>
        <View style={styles.searchHeader}>
          <PixelButton style={styles.backBtn} onPress={() => setCurrentView('meals')}>
            {"<- BATAL"}
          </PixelButton>
          <Text style={styles.searchTitle}>SALIN DARI KEMARIN</Text>
        </View>

        {loadingYesterday ? (
          <ActivityIndicator size="large" color="#000000" style={{ marginTop: 24 }} />
        ) : (
          <View style={{ flex: 1 }}>
            <Text style={styles.copySubtitle}>PILIH MAKANAN UNTUK DISALIN KE HARI INI:</Text>
            
            <ScrollView style={styles.copyLogsScroll}>
              {yesterdayLogs.length === 0 ? (
                <Text style={styles.noResultsText}>TIDAK ADA RIWAYAT MAKANAN KEMARIN.</Text>
              ) : (
                yesterdayLogs.map((log) => {
                  const isSelected = selectedYesterdayIds.includes(log.id);
                  return (
                    <Pressable
                      key={log.id}
                      onPress={() => toggleYesterdaySelection(log.id)}
                      style={styles.copyLogItem}
                    >
                      <PixelCard
                        style={[styles.copyLogCard, isSelected ? styles.selectedCard : null]}
                        innerStyle={{ padding: 12 }}
                        hasShadow={false}
                      >
                        <View style={styles.checkboxRow}>
                          <Text style={styles.checkboxText}>
                            {isSelected ? '[X]' : '[ ]'}
                          </Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.copyLogFoodName}>
                              {log.food_name?.toUpperCase() || 'MAKANAN'}
                            </Text>
                            <Text style={styles.copyLogFoodDetail}>
                              {log.meal_type.toUpperCase()} • {Math.round(log.serving_g)}G • {Math.round(log.calorie)} KCAL
                            </Text>
                          </View>
                        </View>
                      </PixelCard>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

            {yesterdayLogs.length > 0 && (
              <PixelButton 
                style={styles.executeCopyBtn}
                onPress={handleExecuteCopy}
                disabled={selectedYesterdayIds.length === 0}
              >
                SALIN {selectedYesterdayIds.length} MAKANAN KE HARI INI
              </PixelButton>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.container}>
          {currentView === 'meals' && renderMealsView()}
          {currentView === 'search' && renderSearchView()}
          {currentView === 'custom_food' && renderCustomFoodView()}
          {currentView === 'copy_yesterday' && renderCopyYesterdayView()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  mealsContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 14,
    color: '#000000',
  },
  copyBtn: {
    minWidth: 100,
  },
  mealCard: {
    marginBottom: 16,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    paddingBottom: 10,
    marginBottom: 10,
  },
  mealLabel: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 10,
    color: '#000000',
    marginBottom: 4,
  },
  mealCalSum: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#888888',
  },
  addFoodBtn: {
    width: 90,
  },
  logList: {
    flexDirection: 'column',
  },
  emptyLogText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#888888',
    textAlign: 'center',
    paddingVertical: 12,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  logFoodName: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 9,
    color: '#000000',
    marginBottom: 4,
    lineHeight: 14,
  },
  logFoodGrams: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 7,
    color: '#888888',
  },
  deleteLogBtn: {
    width: 32,
    height: 32,
    minHeight: 32,
  },
  searchContainer: {
    flex: 1,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    width: 100,
    marginRight: 12,
  },
  searchTitle: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 10,
    color: '#000000',
    flex: 1,
    textAlign: 'right',
  },
  searchBarRow: {
    marginBottom: 12,
  },
  searchInput: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 9,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    height: 44,
    paddingHorizontal: 12,
    textAlignVertical: 'center',
    paddingVertical: 0,
    color: '#000000',
  },
  customFoodRedirectBtn: {
    marginBottom: 16,
  },
  searchResultsScroll: {
    maxHeight: 400,
  },
  noResultsText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#888888',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 14,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#E5E5E5',
  },
  searchResultName: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#000000',
    lineHeight: 14,
    flex: 1,
  },
  searchResultCal: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 7,
    color: '#888888',
  },
  portionCard: {
    padding: 16,
  },
  selectedFoodName: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 11,
    color: '#000000',
    lineHeight: 16,
    marginBottom: 6,
  },
  selectedFoodGizi: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 7,
    color: '#888888',
    marginBottom: 16,
    lineHeight: 12,
  },
  portionOptions: {
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#000000',
    marginBottom: 10,
  },
  portionOptionPressable: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  portionOptionText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#888888',
    lineHeight: 12,
  },
  activePortionText: {
    color: '#000000',
    fontWeight: 'bold',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  qtyLabel: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#000000',
    marginRight: 12,
  },
  qtyInput: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 9,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    height: 44,
    width: 80,
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingVertical: 0,
    color: '#000000',
  },
  liveCalculationBox: {
    borderWidth: 2,
    borderColor: '#000000',
    padding: 12,
    backgroundColor: '#E5E5E5',
    marginBottom: 16,
  },
  liveCalTitle: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#888888',
    marginBottom: 6,
  },
  liveCalVal: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 10,
    color: '#000000',
    marginBottom: 4,
  },
  liveMacrosVal: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 7,
    color: '#000000',
  },
  portionButtons: {
    flexDirection: 'row',
  },
  customContainer: {
    flexDirection: 'column',
  },
  customCard: {
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#000000',
    marginBottom: 6,
  },
  input: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 9,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    height: 44,
    paddingHorizontal: 8,
    textAlignVertical: 'center',
    paddingVertical: 0,
    color: '#000000',
  },
  giziGrid: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  giziGridCol: {
    flex: 1,
    marginRight: 8,
  },
  portionHeading: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#000000',
    marginTop: 12,
    marginBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingTop: 12,
  },
  errorBox: {
    borderWidth: 2,
    borderColor: '#000000',
    padding: 8,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  errorText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#000000',
    textAlign: 'center',
  },
  // Suggest Styles
  suggestSection: {
    marginTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#000000',
    paddingTop: 16,
  },
  suggestHeader: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 9,
    color: '#000000',
    marginBottom: 12,
  },
  suggestList: {
    flexDirection: 'column',
  },
  tapText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 12,
    color: '#888888',
    marginLeft: 8,
  },
  suggestMsgCard: {
    backgroundColor: '#E5E5E5',
  },
  suggestMsgText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#000000',
    textAlign: 'center',
    lineHeight: 14,
  },
  // Copy Styles
  copyContainer: {
    flex: 1,
  },
  copySubtitle: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#888888',
    lineHeight: 14,
    marginBottom: 16,
  },
  copyLogsScroll: {
    maxHeight: 380,
    marginBottom: 16,
  },
  copyLogItem: {
    marginBottom: 8,
  },
  copyLogCard: {
    backgroundColor: '#FFFFFF',
  },
  selectedCard: {
    backgroundColor: '#E5E5E5',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 10,
    color: '#000000',
    marginRight: 12,
  },
  copyLogFoodName: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#000000',
    marginBottom: 4,
    lineHeight: 12,
  },
  copyLogFoodDetail: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 7,
    color: '#888888',
  },
  executeCopyBtn: {
    marginTop: 8,
  },
});
