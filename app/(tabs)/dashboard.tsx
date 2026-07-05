import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, ActivityIndicator, Pressable, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useProfileStore } from '../../src/store/useProfileStore';
import { useDashboardStore, getTodayLocalDateString } from '../../src/store/useDashboardStore';
import { useDailyResetGuard } from '../../src/hooks/useDailyResetGuard';
import { calculateWeightProjection, WeightProjection } from '../../src/engine/weightProjection';
import { getDb } from '../../src/db/client';
import { dailyNotesRepo, DailyNote } from '../../src/repositories/dailyNotesRepo';
import { weightRepo } from '../../src/repositories/weightRepo';
import { useAchievementStore } from '../../src/store/useAchievementStore';
import AchievementToast from '../../src/components/ui/AchievementToast';
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

  // Achievements
  const { activeToast, clearToast, checkAndUnlock } = useAchievementStore();

  // V2 UI States
  const [projection, setProjection] = useState<WeightProjection | null>(null);
  const [showWeighInReminder, setShowWeighInReminder] = useState(false);
  const [weighInInput, setWeighInInput] = useState('');
  const [savingWeighIn, setSavingWeighIn] = useState(false);

  // Daily Notes & Mood Modal States
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedMood, setSelectedMood] = useState<'great' | 'good' | 'neutral' | 'bad' | 'terrible'>('neutral');
  const [dailyNoteText, setDailyNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const loadDashboardData = async () => {
    if (!profile) return;
    try {
      const db = await getDb();
      const todayStr = getTodayLocalDateString();

      // 1. Load projection
      const rows = await db.getAllAsync<{ log_date: string; total_calorie: number; target_calorie: number }>(
        'SELECT log_date, total_calorie, target_calorie FROM daily_history ORDER BY log_date DESC LIMIT 7'
      );
      const proj = calculateWeightProjection(
        profile.weight_kg,
        profile.target_weight_kg,
        profile.goal,
        rows,
        profile.tdee || 2000,
        profile.target_calorie || 2000,
        todayStr
      );
      setProjection(proj);

      // 2. Load daily note/mood
      const note = await dailyNotesRepo.getDailyNote(todayStr);
      if (note) {
        setSelectedMood(note.mood);
        setDailyNoteText(note.note || '');
      } else {
        setSelectedMood('neutral');
        setDailyNoteText('');
      }

      // 3. Check weigh-in reminder
      if (profile.last_weigh_in_date) {
        const today = new Date(todayStr);
        const lastWeighIn = new Date(profile.last_weigh_in_date);
        const diffTime = Math.abs(today.getTime() - lastWeighIn.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= (profile.weigh_in_interval_days ?? 7)) {
          setShowWeighInReminder(true);
        } else {
          setShowWeighInReminder(false);
        }
      } else {
        setShowWeighInReminder(true);
      }

      // Check for streak freeze alert
      const alertRow = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM app_state WHERE key = 'streak_freeze_alert_message'"
      );
      if (alertRow && alertRow.value) {
        alert(alertRow.value);
        // Clear alert
        await db.runAsync(
          "DELETE FROM app_state WHERE key = 'streak_freeze_alert_message'"
        );
      }

      // 4. Run achievements check
      await checkAndUnlock();
    } catch (err) {
      console.error('Failed loading dashboard dependencies:', err);
    }
  };

  useEffect(() => {
    if (!checking && profile) {
      loadDashboardData();
    }
  }, [checking, profile, totals.calorie]); // Reload when totals change

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

  const handleSaveWeighIn = async () => {
    const w = parseFloat(weighInInput);
    if (isNaN(w) || w <= 0) {
      return;
    }
    setSavingWeighIn(true);
    try {
      const todayStr = getTodayLocalDateString();
      await weightRepo.addWeightLog(w, todayStr, 'Timbang berkala');

      // Update profile weight in store
      await useProfileStore.getState().saveUpdatedProfile(
        { ...profile, weight_kg: w, last_weigh_in_date: todayStr },
        useProfileStore.getState().restrictionTagIds,
        useProfileStore.getState().preferenceTagIds
      );

      playSfx('blip');
      setWeighInInput('');
      setShowWeighInReminder(false);
      
      // Check achievements
      await checkAndUnlock(w);
      
      // Reload dashboard data
      await loadDashboardData();
    } catch (err) {
      console.error('Weigh-in error:', err);
    } finally {
      setSavingWeighIn(false);
    }
  };

  const handleSaveDailyNote = async () => {
    setSavingNote(true);
    try {
      const todayStr = getTodayLocalDateString();
      await dailyNotesRepo.saveDailyNote(todayStr, selectedMood, dailyNoteText);
      playSfx('blip');
      setShowNotesModal(false);
      await loadDashboardData();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNote(false);
    }
  };

  const getMoodEmoji = (mood: string) => {
    switch (mood) {
      case 'great': return '😀';
      case 'good': return '🙂';
      case 'neutral': return '😐';
      case 'bad': return '🙁';
      case 'terrible': return '😭';
      default: return '😐';
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {activeToast && (
        <AchievementToast
          label={activeToast.label}
          description={activeToast.description}
          onDismiss={clearToast}
        />
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>LOG HARIAN</Text>
              <Text style={styles.headerDate}>{getTodayLocalDateString()}</Text>
            </View>
            <PixelButton
              style={styles.pencilBtn}
              onPress={() => {
                playSfx('beep');
                setShowNotesModal(true);
              }}
            >
              📝 MOOD
            </PixelButton>
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

          {/* Target Weight Projections Card (v2) */}
          {projection && (
            <PixelCard style={styles.projectionCard}>
              <Text style={styles.projectionTitle}>PROYEKSI TARGET BB</Text>
              {projection.estimatedDays === -1 ? (
                <Text style={styles.projectionText}>
                  {profile.goal === 'maintenance'
                    ? 'MODE MAINTENANCE — JAGA KONSISTENSI!'
                    : 'BUTUH LEBIH BANYAK LOG HARIAN UNTUK PROYEKSI AKURAT.'}
                </Text>
              ) : (
                <View>
                  <Text style={styles.projectionText}>
                    ESTIMASI: {projection.estimatedDate} (~{Math.ceil(projection.estimatedDays / 7)} MINGGU LAGI)
                  </Text>
                  <Text style={styles.projectionSubText}>
                    {projection.isOnTrack 
                      ? `KAMU ON TRACK! RATA-RATA DEFISIT/SURPLUS: ${Math.round(Math.abs(projection.averageDailyDeficit))} KCAL.`
                      : 'DEFISIT/SURPLUS HARIAN BELUM SESUAI TARGET GOAL.'}
                  </Text>
                </View>
              )}
            </PixelCard>
          )}

          {/* Weigh In Reminder Banner (v2) */}
          {showWeighInReminder && (
            <PixelCard style={styles.reminderCard}>
              <Text style={styles.reminderTitle}>🛎️ WAKTUNYA TIMBANG BADAN!</Text>
              <View style={styles.reminderInputRow}>
                <TextInput
                  style={styles.weighInTextInput}
                  keyboardType="numeric"
                  placeholder="BB (KG)"
                  placeholderTextColor="#888888"
                  value={weighInInput}
                  onChangeText={(val) => setWeighInInput(val.replace(/[^0-9.]/g, ''))}
                />
                <View style={{ width: 10 }} />
                <PixelButton
                  style={styles.weighInBtn}
                  disabled={savingWeighIn || weighInInput.trim() === ''}
                  onPress={handleSaveWeighIn}
                >
                  SIMPAN
                </PixelButton>
              </View>
            </PixelCard>
          )}

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

      {/* Mood & Daily Notes Modal (v2) */}
      <Modal
        visible={showNotesModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNotesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <PixelCard style={styles.modalCard} innerStyle={{ padding: 16 }}>
            <Text style={styles.modalTitle}>CATATAN & MOOD</Text>

            <Text style={styles.modalLabel}>BAGAIMANA MOOD KAMU HARI INI?</Text>
            <View style={styles.moodRow}>
              {(['great', 'good', 'neutral', 'bad', 'terrible'] as const).map((m) => {
                const isSelected = selectedMood === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => {
                      playSfx('beep');
                      setSelectedMood(m);
                    }}
                    style={[styles.moodItem, isSelected ? styles.selectedMoodItem : null]}
                  >
                    <Text style={styles.moodEmoji}>{getMoodEmoji(m)}</Text>
                    <Text style={styles.moodText}>{m.toUpperCase()}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.modalLabel}>CATATAN SINGKAT (MAKS 200 KARAKTER):</Text>
            <TextInput
              style={styles.notesInput}
              multiline={true}
              numberOfLines={4}
              maxLength={200}
              placeholder="MISAL: HARI INI OLAHRAGA TERASA BERAT, TAPI BERHASIL SELESAI..."
              placeholderTextColor="#888888"
              value={dailyNoteText}
              onChangeText={setDailyNoteText}
            />

            <View style={styles.modalButtonsRow}>
              <PixelButton 
                style={{ flex: 1 }} 
                onPress={handleSaveDailyNote}
                disabled={savingNote}
              >
                SIMPAN
              </PixelButton>
              <View style={{ width: 12 }} />
              <PixelButton 
                variant="secondary" 
                style={{ flex: 1 }} 
                onPress={() => setShowNotesModal(false)}
                disabled={savingNote}
              >
                BATAL
              </PixelButton>
            </View>
          </PixelCard>
        </View>
      </Modal>
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
    padding: 16,
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
    marginBottom: 16,
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
    marginTop: 4,
  },
  pencilBtn: {
    width: 90,
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
  // Projection Card Styles
  projectionCard: {
    marginBottom: 16,
    padding: 12,
  },
  projectionTitle: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#000000',
    marginBottom: 8,
  },
  projectionText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#000000',
    lineHeight: 14,
  },
  projectionSubText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 6,
    color: '#888888',
    marginTop: 6,
    lineHeight: 10,
  },
  // Reminder Card Styles
  reminderCard: {
    backgroundColor: '#E5E5E5',
    marginBottom: 16,
    padding: 12,
  },
  reminderTitle: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#000000',
    marginBottom: 10,
  },
  reminderInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weighInTextInput: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 9,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    height: 44,
    flex: 1,
    paddingHorizontal: 8,
    textAlignVertical: 'center',
    paddingVertical: 0,
    color: '#000000',
  },
  weighInBtn: {
    width: 90,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
  },
  modalTitle: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 12,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalLabel: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 7,
    color: '#888888',
    marginBottom: 8,
    lineHeight: 12,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  moodItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedMoodItem: {
    borderColor: '#000000',
    backgroundColor: '#E5E5E5',
  },
  moodEmoji: {
    fontSize: 18,
    marginBottom: 4,
  },
  moodText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 5,
    color: '#000000',
  },
  notesInput: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    height: 80,
    padding: 8,
    textAlignVertical: 'top',
    color: '#000000',
    marginBottom: 16,
  },
  modalButtonsRow: {
    flexDirection: 'row',
  },
});
