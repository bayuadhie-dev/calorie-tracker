import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useDashboardStore } from '../../src/store/useDashboardStore';
import { useProfileStore } from '../../src/store/useProfileStore';
import { foodRepo, FoodItem, FoodPortion } from '../../src/repositories/foodRepo';
import { MealType, FoodLog } from '../../src/repositories/logRepo';
import PixelButton from '../../src/components/ui/PixelButton';
import PixelCard from '../../src/components/ui/PixelCard';
import { useSfx } from '../../src/hooks/useSfx';

type SubView = 'meals' | 'search' | 'custom_food';

export default function MealPlanner() {
  const { profile, restrictionTagIds } = useProfileStore();
  const { foodLogs, logFood, removeFoodLog } = useDashboardStore();
  const { playSfx } = useSfx();

  const [currentView, setCurrentView] = useState<SubView>('meals');
  const [activeMealType, setActiveMealType] = useState<MealType>('breakfast');

  // Search View State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [portions, setPortions] = useState<FoodPortion[]>([]);
  const [selectedPortionIndex, setSelectedPortionIndex] = useState<number>(0); // Index in portions
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

  // 1. Search foods when search query changes
  useEffect(() => {
    if (currentView !== 'search') return;
    
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

  // 2. Load portions when a food is selected
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

  // 3. Log food from search view
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

  // 4. Save and Log Custom Food
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
      // Default log serving: if custom portion was specified, log 1 portion of it, else log 100g
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
        <View style={styles.header}>
          <Text style={styles.headerTitle}>MEAL PLANNER</Text>
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

              {/* Direct Grams Input */}
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

            {/* Live Calculation Aggregates */}
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

            {searching ? (
              <ActivityIndicator size="large" color="#000000" style={{ marginTop: 24 }} />
            ) : (
              <ScrollView style={styles.searchResultsScroll}>
                {searchResults.length === 0 ? (
                  <Text style={styles.noResultsText}>
                    {searchQuery.trim().length > 0
                      ? 'MAKANAN TIDAK DITEMUKAN.'
                      : 'Ketik pencarian di atas...'}
                  </Text>
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
                placeholder="8"
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
                placeholder="10"
                placeholderTextColor="#888888"
                value={customFat}
                onChangeText={(val) => setCustomFat(val.replace(/[^0-9.]/g, ''))}
              />
            </View>
          </View>

          {/* Optional Portion configuration */}
          <Text style={styles.portionHeading}>OPSI PORSI KUSTOM (OPSIONAL):</Text>
          <View style={styles.giziGrid}>
            <View style={{ flex: 1.5, marginRight: 8 }}>
              <Text style={styles.label}>NAMA UNIT:</Text>
              <TextInput
                style={styles.input}
                placeholder="MISAL: MANGKOK"
                placeholderTextColor="#888888"
                value={customPortionLabel}
                onChangeText={setCustomPortionLabel}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>BERAT (G):</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="220"
                placeholderTextColor="#888888"
                value={customPortionGrams}
                onChangeText={(val) => setCustomPortionGrams(val.replace(/[^0-9.]/g, ''))}
              />
            </View>
          </View>
        </PixelCard>

        <PixelButton style={{ marginTop: 16 }} onPress={handleSaveCustomFood}>
          SIMPAN & LOG MAKANAN
        </PixelButton>
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
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 14,
    color: '#000000',
  },
  mealsContainer: {
    flexDirection: 'column',
  },
  mealCard: {
    marginBottom: 16,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    paddingBottom: 12,
    marginBottom: 12,
  },
  mealLabel: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 10,
    color: '#000000',
  },
  mealCalSum: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#888888',
    marginTop: 4,
  },
  addFoodBtn: {
    width: 90,
    height: 36,
  },
  logList: {
    flexDirection: 'column',
  },
  emptyLogText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 7,
    color: '#888888',
    textAlign: 'center',
    paddingVertical: 8,
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  logFoodName: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#000000',
    lineHeight: 12,
  },
  logFoodGrams: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 6,
    color: '#888888',
    marginTop: 4,
  },
  deleteLogBtn: {
    width: 28,
    height: 28,
  },
  searchContainer: {
    flexDirection: 'column',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    width: 110,
    height: 36,
    marginRight: 12,
  },
  searchTitle: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 10,
    color: '#000000',
    flex: 1,
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
    height: 40,
    paddingHorizontal: 12,
    paddingVertical: 0,
    color: '#000000',
  },
  customFoodRedirectBtn: {
    marginBottom: 16,
    height: 36,
  },
  searchResultsScroll: {
    maxHeight: 400,
    borderWidth: 2,
    borderColor: '#000000',
  },
  searchResultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  searchResultName: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#000000',
    lineHeight: 12,
  },
  searchResultCal: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 6,
    color: '#888888',
    marginTop: 4,
  },
  noResultsText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#888888',
    textAlign: 'center',
    paddingVertical: 24,
  },
  portionCard: {
    marginBottom: 16,
  },
  selectedFoodName: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 10,
    color: '#000000',
    lineHeight: 14,
    marginBottom: 6,
  },
  selectedFoodGizi: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 6,
    color: '#888888',
    lineHeight: 10,
    marginBottom: 16,
  },
  portionOptions: {
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#000000',
    marginBottom: 8,
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
  },
  activePortionText: {
    color: '#000000',
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
    flex: 1,
  },
  qtyInput: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 10,
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
    borderStyle: 'dashed',
    borderColor: '#000000',
    padding: 12,
    backgroundColor: '#F3F3F3',
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
});
