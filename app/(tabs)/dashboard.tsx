import React from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useProfileStore } from '../../src/store/useProfileStore';
import { useDashboardStore, getTodayLocalDateString } from '../../src/store/useDashboardStore';
import { useDailyResetGuard } from '../../src/hooks/useDailyResetGuard';
import PixelButton from '../../src/components/ui/PixelButton';
import PixelCard from '../../src/components/ui/PixelCard';
import PixelProgressBar from '../../src/components/ui/PixelProgressBar';
import { useSfx } from '../../src/hooks/useSfx';

export default function Dashboard() {
  const router = useRouter();
  const { profile } = useProfileStore();
  const { totals, waterIntake, checklist, toggleChecklistItem, logWater, undoWaterLog } = useDashboardStore();
  const { checking } = useDailyResetGuard();
  const { playSfx } = useSfx();

  if (checking || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>LOADING DASHBOARD...</Text>
      </View>
    );
  }

  // Calculations
  const remainingCalorie = profile.target_calorie - totals.calorie;
  const isOverCalorie = remainingCalorie < 0;

  const carbProgress = totals.carb_g / profile.target_carb_g;
  const proteinProgress = totals.protein_g / profile.target_protein_g;
  const fatProgress = totals.fat_g / profile.target_fat_g;
  const calorieProgress = totals.calorie / profile.target_calorie;
  const waterProgress = waterIntake / profile.target_water_ml;

  const handleWaterAdd = () => {
    logWater(250);
  };

  const handleWaterUndo = () => {
    undoWaterLog();
  };

  const handleActivityToggle = async (id: number, isDone: number) => {
    const nextVal = isDone === 0;
    await toggleChecklistItem(id, nextVal);
    // Play sound on completion
    if (nextVal) {
      // Check if all checklist items are now completed
      const nextChecklist = checklist.map((item) =>
        item.id === id ? { ...item, is_done: 1 } : item
      );
      const allDone = nextChecklist.every((item) => item.is_done === 1);
      if (allDone) {
        playSfx('levelup');
      } else {
        playSfx('blip');
      }
    } else {
      playSfx('beep');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>LOG HARIAN</Text>
            <Text style={styles.headerDate}>{getTodayLocalDateString()}</Text>
          </View>

          {/* Profile Header Stats */}
          <PixelCard style={styles.profileHeaderCard}>
            <View style={styles.profileHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileLabel}>BB KAMU</Text>
                <Text style={styles.profileVal}>{profile.weight_kg} KG</Text>
              </View>
              <View style={styles.profileGoalSeparator} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={styles.profileLabel}>GOAL</Text>
                <Text style={styles.profileVal}>{profile.goal.toUpperCase()}</Text>
              </View>
              <View style={styles.profileGoalSeparator} />
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.profileLabel}>TARGET BB</Text>
                <Text style={styles.profileVal}>{profile.target_weight_kg || profile.weight_kg} KG</Text>
              </View>
            </View>
          </PixelCard>

          {/* Hero Calorie Section */}
          <PixelCard style={styles.heroCard}>
            <Text style={styles.heroLabel}>SISA KALORI</Text>
            <Text
              style={[
                styles.heroCalorieNumber,
                isOverCalorie ? styles.overText : null,
              ]}
            >
              {isOverCalorie
                ? `+${Math.abs(remainingCalorie)}`
                : remainingCalorie}
            </Text>
            <Text style={styles.heroSubText}>
              {isOverCalorie ? 'MELEBIHI BATAS' : 'KCAL TERSISA'}
            </Text>

            <View style={styles.calorieDetails}>
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>TARGET</Text>
                <Text style={styles.detailVal}>{profile.target_calorie}</Text>
              </View>
              <View style={styles.dividerLine} />
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>LOG</Text>
                <Text style={styles.detailVal}>{totals.calorie}</Text>
              </View>
            </View>

            <PixelProgressBar
              progress={calorieProgress}
              style={{ marginTop: 12 }}
            />
          </PixelCard>

          {/* Macros Section */}
          <PixelCard style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>NUTRISI MAKRO</Text>
            
            <View style={styles.macroRow}>
              <View style={styles.macroLabelCol}>
                <Text style={styles.macroLabel}>KARBO</Text>
                <Text style={styles.macroVal}>
                  {totals.carb_g}/{profile.target_carb_g}g
                </Text>
              </View>
              <PixelProgressBar progress={carbProgress} style={styles.macroBar} />
            </View>

            <View style={styles.macroRow}>
              <View style={styles.macroLabelCol}>
                <Text style={styles.macroLabel}>PROT</Text>
                <Text style={styles.macroVal}>
                  {totals.protein_g}/{profile.target_protein_g}g
                </Text>
              </View>
              <PixelProgressBar progress={proteinProgress} style={styles.macroBar} />
            </View>

            <View style={styles.macroRow}>
              <View style={styles.macroLabelCol}>
                <Text style={styles.macroLabel}>LEMAK</Text>
                <Text style={styles.macroVal}>
                  {totals.fat_g}/{profile.target_fat_g}g
                </Text>
              </View>
              <PixelProgressBar progress={fatProgress} style={styles.macroBar} />
            </View>
          </PixelCard>

          {/* Hydration Tracker */}
          <PixelCard style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>HIDRASI (AIR)</Text>
            <View style={styles.waterStatusRow}>
              <View style={styles.waterStats}>
                <Text style={styles.waterNumber}>
                  {waterIntake}/{profile.target_water_ml}
                </Text>
                <Text style={styles.waterUnit}>ML MINUM</Text>
              </View>
              <Text style={styles.waterBottleIcon}>
                {waterProgress >= 1.0 ? '|~| [FULL]' : '| | [ ]'}
              </Text>
            </View>

            <PixelProgressBar progress={waterProgress} style={{ marginBottom: 12 }} />

            <View style={styles.waterButtonsRow}>
              <PixelButton
                style={styles.waterAddBtn}
                onPress={handleWaterAdd}
                sfxType="blip"
              >
                + 250 ML
              </PixelButton>
              <View style={{ width: 12 }} />
              <PixelButton
                variant="secondary"
                style={styles.waterUndoBtn}
                onPress={handleWaterUndo}
                disabled={waterIntake === 0}
              >
                BATAL
              </PixelButton>
            </View>
          </PixelCard>

          {/* Daily Activity Checklist */}
          <PixelCard style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>TUGAS HARIAN</Text>
            {checklist.length === 0 ? (
              <Text style={styles.emptyText}>TIDAK ADA TUGAS HARI INI.</Text>
            ) : (
              checklist.map((item) => {
                const isDone = item.is_done === 1;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => handleActivityToggle(item.id, item.is_done)}
                    style={styles.taskItem}
                  >
                    <Text style={[styles.taskCheckbox, isDone ? styles.taskChecked : null]}>
                      {isDone ? '[X]' : '[ ]'}
                    </Text>
                    <Text style={[styles.taskLabel, isDone ? styles.taskDoneText : null]}>
                      {item.label.toUpperCase()}
                    </Text>
                  </Pressable>
                )
              })
            )}
          </PixelCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Simple internal Pressable component
import { Pressable } from 'react-native';

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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 9,
    marginTop: 12,
    color: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 14,
    color: '#000000',
  },
  headerDate: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#888888',
  },
  heroCard: {
    marginBottom: 16,
  },
  heroLabel: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 4,
  },
  heroCalorieNumber: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 32,
    color: '#000000',
    textAlign: 'center',
    lineHeight: 40,
  },
  overText: {
    textDecorationLine: 'underline',
  },
  heroSubText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#888888',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  calorieDetails: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  detailCol: {
    alignItems: 'center',
    width: 80,
  },
  detailLabel: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#888888',
    marginBottom: 4,
  },
  detailVal: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 12,
    color: '#000000',
  },
  dividerLine: {
    width: 2,
    height: 24,
    backgroundColor: '#000000',
    marginHorizontal: 16,
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 10,
    color: '#000000',
    marginBottom: 16,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  macroLabelCol: {
    width: 100,
  },
  macroLabel: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#000000',
    marginBottom: 2,
  },
  macroVal: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 6,
    color: '#888888',
  },
  macroBar: {
    flex: 1,
  },
  waterStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  waterStats: {
    flexDirection: 'column',
  },
  waterNumber: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 16,
    color: '#000000',
  },
  waterUnit: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#888888',
    marginTop: 4,
  },
  waterBottleIcon: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 12,
    color: '#000000',
  },
  waterButtonsRow: {
    flexDirection: 'row',
  },
  waterAddBtn: {
    flex: 2,
  },
  waterUndoBtn: {
    flex: 1,
  },
  emptyText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#888888',
    textAlign: 'center',
    paddingVertical: 12,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  taskCheckbox: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 10,
    color: '#000000',
    marginRight: 12,
  },
  taskChecked: {
    color: '#888888',
  },
  taskLabel: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#000000',
    flex: 1,
    lineHeight: 14,
  },
  taskDoneText: {
    color: '#888888',
    textDecorationLine: 'line-through',
  },
  profileHeaderCard: {
    marginBottom: 16,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileLabel: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 7,
    color: '#888888',
    marginBottom: 4,
  },
  profileVal: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#000000',
  },
  profileGoalSeparator: {
    width: 2,
    height: 20,
    backgroundColor: '#000000',
    marginHorizontal: 12,
  },
});
