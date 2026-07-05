import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, Alert, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../../src/store/useSettingsStore';
import { useProfileStore } from '../../src/store/useProfileStore';
import { useDashboardStore } from '../../src/store/useDashboardStore';
import { exportBackup, importBackup } from '../../src/utils/backupExport';
import { getDb } from '../../src/db/client';
import { calculateProfileNutrition, Gender, Goal, ActivityLevel } from '../../src/engine/bmrTdee';
import { calculateWaterTarget } from '../../src/engine/waterCalc';
import { foodRepo, RestrictionTag } from '../../src/repositories/foodRepo';
import { notificationService } from '../../src/services/notificationService';
import PixelButton from '../../src/components/ui/PixelButton';
import PixelCard from '../../src/components/ui/PixelCard';
import { useSfx } from '../../src/hooks/useSfx';

type SettingsView = 'main' | 'edit_profile' | 'edit_tags';

export default function Settings() {
  const router = useRouter();
  const { soundEffectsEnabled, toggleSoundEffects } = useSettingsStore();
  const { profile, restrictionTagIds, preferenceTagIds, saveUpdatedProfile, fetchProfile, resetProfile } = useProfileStore();
  const { loadDailyData } = useDashboardStore();
  const { playSfx } = useSfx();

  const [currentView, setCurrentView] = useState<SettingsView>('main');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  // Reminders Notification Toggle State
  const [remindersEnabled, setRemindersEnabled] = useState(false);

  // Edit Profile Form State
  const [weight, setWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [goal, setGoal] = useState<Goal>('maintenance');
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [interval, setIntervalDays] = useState('7');
  const [editError, setEditError] = useState('');

  // Edit Tags Form State
  const [restrictions, setRestrictions] = useState<RestrictionTag[]>([]);
  const [preferences, setPreferences] = useState<RestrictionTag[]>([]);
  const [selectedRestIds, setSelectedRestIds] = useState<number[]>([]);
  const [selectedPrefIds, setSelectedPrefIds] = useState<number[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);

  useEffect(() => {
    async function loadNotificationState() {
      try {
        const db = await getDb();
        const row = await db.getFirstAsync<{ value: string }>(
          "SELECT value FROM app_state WHERE key = 'notifications_enabled'"
        );
        setRemindersEnabled(row?.value === 'true');
      } catch (err) {
        console.error(err);
      }
    }
    loadNotificationState();
  }, []);

  const showStatus = (msg: string, error = false) => {
    setMessage(msg);
    setIsError(error);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleExport = async () => {
    const success = await exportBackup();
    if (success) {
      showStatus('EKSPOR BACKUP BERHASIL!');
    } else {
      showStatus('EKSPOR BACKUP GAGAL!', true);
    }
  };

  const handleImport = async () => {
    const result = await importBackup();
    if (result.success) {
      await fetchProfile();
      await loadDailyData();
      playSfx('levelup');
      showStatus('IMPOR BACKUP BERHASIL! DATA TELAH DIPULIHKAN.');
    } else if (result.errorMsg) {
      showStatus(`IMPOR GAGAL: ${result.errorMsg.toUpperCase()}`, true);
    }
  };

  const handleToggleReminders = async () => {
    playSfx('beep');
    const nextVal = !remindersEnabled;
    setRemindersEnabled(nextVal);
    try {
      const db = await getDb();
      await db.runAsync(
        "INSERT OR REPLACE INTO app_state (key, value) VALUES ('notifications_enabled', ?)",
        nextVal ? 'true' : 'false'
      );
      if (nextVal) {
        await notificationService.scheduleReminders();
        showStatus('PENGINGAT DIJADWALKAN!');
      } else {
        await notificationService.cancelAllReminders();
        showStatus('PENGINGAT DINONAKTIFKAN.');
      }
    } catch (err) {
      console.error('Failed toggling reminders:', err);
    }
  };

  const handleOpenEditProfile = () => {
    if (!profile) return;
    playSfx('beep');
    setWeight(profile.weight_kg.toString());
    setTargetWeight((profile.target_weight_kg || profile.weight_kg).toString());
    setHeight(profile.height_cm.toString());
    setAge(profile.age.toString());
    setGender(profile.gender);
    setGoal(profile.goal);
    setActivity(profile.activity_level);
    setIntervalDays((profile.weigh_in_interval_days || 7).toString());
    setEditError('');
    setCurrentView('edit_profile');
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setEditError('');
    
    const w = parseFloat(weight);
    const tw = parseFloat(targetWeight);
    const h = parseFloat(height);
    const a = parseInt(age, 10);
    const intDays = parseInt(interval, 10);

    if (isNaN(w) || w <= 0 || isNaN(tw) || tw <= 0 || isNaN(h) || h <= 0 || isNaN(a) || a <= 0 || isNaN(intDays) || intDays <= 0) {
      setEditError('SEMUA FIELD HARUS BERUPA ANGKA POSITIF!');
      return;
    }

    try {
      // Recalculate metrics
      const nutrition = calculateProfileNutrition({
        weightKg: w,
        heightCm: h,
        age: a,
        gender,
        goal,
        activityLevel: activity,
      });

      const waterTarget = calculateWaterTarget(w, activity, goal);

      const updatedProfile = {
        ...profile,
        weight_kg: w,
        target_weight_kg: tw,
        height_cm: h,
        age: a,
        gender,
        goal,
        activity_level: activity,
        bmr: nutrition.bmr,
        tdee: nutrition.tdee,
        target_calorie: nutrition.targetCalorie,
        target_carb_g: nutrition.targetCarbG,
        target_protein_g: nutrition.targetProteinG,
        target_fat_g: nutrition.targetFatG,
        target_water_ml: waterTarget,
        weigh_in_interval_days: intDays,
      };

      await saveUpdatedProfile(updatedProfile, restrictionTagIds, preferenceTagIds);
      await loadDailyData();
      playSfx('levelup');
      showStatus('PROFIL BERHASIL DIPERBARUI!');
      setCurrentView('main');
    } catch (err) {
      console.error(err);
      setEditError('GAGAL MENYIMPAN PERUBAHAN PROFIL.');
    }
  };

  const handleOpenEditTags = async () => {
    playSfx('beep');
    setLoadingTags(true);
    setCurrentView('edit_tags');
    setSelectedRestIds(restrictionTagIds);
    setSelectedPrefIds(preferenceTagIds);
    try {
      const restTags = await foodRepo.getTagsByType('restriction');
      const prefTags = await foodRepo.getTagsByType('preference');
      setRestrictions(restTags);
      setPreferences(prefTags);
    } catch (err) {
      console.error('Failed to load tags:', err);
    } finally {
      setLoadingTags(false);
    }
  };

  const toggleRestriction = (id: number) => {
    playSfx('beep');
    setSelectedRestIds((prev) =>
      prev.includes(id) ? prev.filter((tId) => tId !== id) : [...prev, id]
    );
  };

  const togglePreference = (id: number) => {
    playSfx('beep');
    setSelectedPrefIds((prev) =>
      prev.includes(id) ? prev.filter((tId) => tId !== id) : [...prev, id]
    );
  };

  const handleSaveTags = async () => {
    if (!profile) return;
    try {
      await saveUpdatedProfile(profile, selectedRestIds, selectedPrefIds);
      playSfx('levelup');
      showStatus('PANTANGAN & PREFERENSI DIPERBARUI!');
      setCurrentView('main');
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetApp = () => {
    Alert.alert(
      'HAPUS SEMUA DATA',
      'APAKAH ANDA YAKIN INGIN MENGHAPUS SELURUH DATA PROFIL, RIWAYAT, DAN MAKANAN? TINDAKAN INI TIDAK DAPAT DIBATALKAN!',
      [
        { text: 'BATAL', style: 'cancel' },
        {
          text: 'YA, HAPUS',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDb();
              await db.withTransactionAsync(async () => {
                await db.runAsync('DELETE FROM user_profile');
                await db.runAsync('DELETE FROM user_food_restrictions');
                await db.runAsync('DELETE FROM user_food_preferences');
                await db.runAsync('DELETE FROM food_logs');
                await db.runAsync('DELETE FROM water_logs');
                await db.runAsync('DELETE FROM activity_checklist_daily');
                await db.runAsync('DELETE FROM daily_history');
                await db.runAsync('DELETE FROM app_state');
                await db.runAsync('DELETE FROM daily_notes');
                await db.runAsync('DELETE FROM weight_logs');
                await db.runAsync('DELETE FROM user_achievements');
                
                await db.runAsync('DELETE FROM food_portion_units WHERE food_item_id IN (SELECT id FROM food_items WHERE is_custom = 1)');
                await db.runAsync('DELETE FROM food_item_tags WHERE food_item_id IN (SELECT id FROM food_items WHERE is_custom = 1)');
                await db.runAsync('DELETE FROM food_items WHERE is_custom = 1');
              });

              await resetProfile();
              playSfx('beep');
              router.replace('/(onboarding)/step-1-biodata');
            } catch (err) {
              console.error('Failed to reset app:', err);
              showStatus('GAGAL MENGHAPUS DATA!', true);
            }
          },
        },
      ]
    );
  };

  const renderMainSettings = () => {
    return (
      <View>
        {profile && (
          <PixelCard style={styles.card}>
            <Text style={styles.sectionTitle}>PROFIL SAYA</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>TARGET HARIAN:</Text>
              <Text style={styles.infoVal}>{profile.target_calorie} KCAL</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ASUPAN AIR:</Text>
              <Text style={styles.infoVal}>{profile.target_water_ml} ML</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>TARGET DIET:</Text>
              <Text style={styles.infoVal}>{profile.goal.toUpperCase()}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>BERAT / TINGGI:</Text>
              <Text style={styles.infoVal}>{profile.weight_kg}KG / {profile.height_cm}CM</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>INTERVAL TIMBANG:</Text>
              <Text style={styles.infoVal}>{profile.weigh_in_interval_days || 7} HARI</Text>
            </View>

            <View style={styles.editButtonsRow}>
              <PixelButton onPress={handleOpenEditProfile} style={{ flex: 1 }}>
                ✏️ EDIT BIODATA
              </PixelButton>
              <View style={{ width: 10 }} />
              <PixelButton variant="secondary" onPress={handleOpenEditTags} style={{ flex: 1 }}>
                🍽️ EDIT DIET
              </PixelButton>
            </View>
          </PixelCard>
        )}

        <PixelCard style={styles.card}>
          <Text style={styles.sectionTitle}>SISTEM & SUARA</Text>
          <PixelButton
            variant={soundEffectsEnabled ? 'secondary' : 'primary'}
            onPress={toggleSoundEffects}
            style={styles.toggleBtn}
          >
            {soundEffectsEnabled ? '[X] EFEK SUARA: AKTIF' : '[ ] EFEK SUARA: MATI'}
          </PixelButton>

          <View style={{ height: 10 }} />

          <PixelButton
            variant={remindersEnabled ? 'secondary' : 'primary'}
            onPress={handleToggleReminders}
            style={styles.toggleBtn}
          >
            {remindersEnabled ? '[X] NOTIFIKASI PENGINGAT: AKTIF' : '[ ] NOTIFIKASI PENGINGAT: MATI'}
          </PixelButton>
        </PixelCard>

        <PixelCard style={styles.card}>
          <Text style={styles.sectionTitle}>BACKUP DATA (OFFLINE)</Text>
          <Text style={styles.descText}>
            KARENA DATA ANDA HANYA DISIMPAN DI HP INI, LAKUKAN BACKUP RUTIN AGAR DATA TIDAK HILANG.
          </Text>
          
          <PixelButton onPress={handleExport} style={styles.btn}>
            EKSPOR BACKUP DATA
          </PixelButton>
          
          <View style={{ height: 12 }} />
          
          <PixelButton variant="secondary" onPress={handleImport} style={styles.btn}>
            IMPOR DATA DARI BACKUP
          </PixelButton>
        </PixelCard>

        <PixelCard style={styles.card}>
          <Text style={styles.sectionTitle}>DANGER ZONE</Text>
          <PixelButton variant="danger" onPress={handleResetApp} style={styles.btn}>
            RESET SEMUA DATA APLIKASI
          </PixelButton>
        </PixelCard>

        <PixelCard style={styles.card}>
          <Text style={styles.sectionTitle}>TENTANG APLIKASI</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>APLIKASI:</Text>
            <Text style={styles.infoVal}>RETRO CALORIE TRACKER</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>VERSI:</Text>
            <Text style={styles.infoVal}>2.0.0 (FINAL BMR)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>PEMBUAT:</Text>
            <Text style={[styles.infoVal, { fontSize: 8, flex: 1, textAlign: 'right' }]} numberOfLines={2}>
              MOCHAMMAD BAYU ADHIE NUGROHO
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ENGINE:</Text>
            <Text style={styles.infoVal}>EXPO ROUTER & SQLITE</Text>
          </View>
          <Text style={[styles.descText, { marginTop: 12, marginBottom: 0, textAlign: 'center', fontSize: 8 }]}>
            © 2026 MOCHAMMAD BAYU ADHIE NUGROHO. ALL RIGHTS RESERVED.
          </Text>
        </PixelCard>
      </View>
    );
  };

  const renderEditProfileView = () => {
    return (
      <View>
        <View style={styles.subHeader}>
          <PixelButton style={styles.backBtn} onPress={() => setCurrentView('main')}>
            {"<- BATAL"}
          </PixelButton>
          <Text style={styles.subTitle}>EDIT BIODATA</Text>
        </View>

        {editError ? (
          <View style={styles.editErrorBox}>
            <Text style={styles.editErrorText}>* {editError} *</Text>
          </View>
        ) : null}

        <PixelCard style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>BERAT AKTUAL (KG):</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={weight}
              onChangeText={(val) => setWeight(val.replace(/[^0-9.]/g, ''))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>TARGET BERAT BADAN (KG):</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={targetWeight}
              onChangeText={(val) => setTargetWeight(val.replace(/[^0-9.]/g, ''))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>TINGGI BADAN (CM):</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={height}
              onChangeText={(val) => setHeight(val.replace(/[^0-9.]/g, ''))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>USIA:</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={age}
              onChangeText={(val) => setAge(val.replace(/[^0-9]/g, ''))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>GENDER:</Text>
            <View style={styles.optionsRow}>
              {(['male', 'female'] as const).map((g) => (
                <Pressable
                  key={g}
                  onPress={() => {
                    playSfx('beep');
                    setGender(g);
                  }}
                  style={[styles.optionItem, gender === g ? styles.optionActive : null]}
                >
                  <Text style={[styles.optionText, gender === g ? styles.optionTextActive : null]}>
                    {g === 'male' ? 'PRIA' : 'WANITA'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>GOAL DIET:</Text>
            <View style={styles.optionsRowVertical}>
              {(['diet', 'maintenance', 'surplus'] as const).map((gl) => (
                <Pressable
                  key={gl}
                  onPress={() => {
                    playSfx('beep');
                    setGoal(gl);
                  }}
                  style={[styles.optionItemVertical, goal === gl ? styles.optionActive : null]}
                >
                  <Text style={[styles.optionText, goal === gl ? styles.optionTextActive : null]}>
                    {gl === 'diet' ? 'DEFISIT (TURUN BERAT)' : gl === 'maintenance' ? 'SEIMBANG (MAINTAIN)' : 'SURPLUS (BULKING)'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>AKTIVITAS HARIAN:</Text>
            <View style={styles.optionsRowVertical}>
              {(['sedentary', 'light', 'moderate', 'active', 'very_active'] as const).map((act) => (
                <Pressable
                  key={act}
                  onPress={() => {
                    playSfx('beep');
                    setActivity(act);
                  }}
                  style={[styles.optionItemVertical, activity === act ? styles.optionActive : null]}
                >
                  <Text style={[styles.optionText, activity === act ? styles.optionTextActive : null]}>
                    {act.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>INTERVAL TIMBANGAN (HARI):</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={interval}
              onChangeText={(val) => setIntervalDays(val.replace(/[^0-9]/g, ''))}
            />
          </View>

          <PixelButton style={{ marginTop: 12 }} onPress={handleSaveProfile}>
            SIMPAN PERUBAHAN
          </PixelButton>
        </PixelCard>
      </View>
    );
  };

  const renderEditTagsView = () => {
    return (
      <View>
        <View style={styles.subHeader}>
          <PixelButton style={styles.backBtn} onPress={() => setCurrentView('main')}>
            {"<- BATAL"}
          </PixelButton>
          <Text style={styles.subTitle}>DIET & PREFERENSI</Text>
        </View>

        {loadingTags ? (
          <ActivityIndicator size="large" color="#000000" style={{ marginTop: 24 }} />
        ) : (
          <View>
            <Text style={styles.sectionHeading}>PANTANGAN / ALERGI:</Text>
            <PixelCard style={styles.card}>
              {restrictions.map((tag) => {
                const isSelected = selectedRestIds.includes(tag.id);
                return (
                  <Pressable
                    key={tag.id}
                    onPress={() => toggleRestriction(tag.id)}
                    style={styles.checkboxPressable}
                  >
                    <Text style={styles.checkboxText}>
                      {isSelected ? '[X] ' : '[ ] '}
                      {tag.label.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </PixelCard>

            <Text style={styles.sectionHeading}>MAKANAN YANG DISUKAI:</Text>
            <PixelCard style={styles.card}>
              {preferences.map((tag) => {
                const isSelected = selectedPrefIds.includes(tag.id);
                return (
                  <Pressable
                    key={tag.id}
                    onPress={() => togglePreference(tag.id)}
                    style={styles.checkboxPressable}
                  >
                    <Text style={styles.checkboxText}>
                      {isSelected ? '[X] ' : '[ ] '}
                      {tag.label.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </PixelCard>

            <PixelButton onPress={handleSaveTags} style={{ marginTop: 8 }}>
              SIMPAN PREFERENSI DIET
            </PixelButton>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.container}>
          {currentView === 'main' && renderMainSettings()}
          {currentView === 'edit_profile' && renderEditProfileView()}
          {currentView === 'edit_tags' && renderEditTagsView()}
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
    padding: 16,
  },
  statusBox: {
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#E5E5E5',
    padding: 12,
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: '#FFFFFF',
  },
  statusText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#000000',
    textAlign: 'center',
    lineHeight: 14,
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 9,
    color: '#000000',
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    paddingBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoLabel: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#888888',
  },
  infoVal: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#000000',
  },
  toggleBtn: {
    width: '100%',
  },
  btn: {
    width: '100%',
  },
  descText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 7,
    color: '#888888',
    lineHeight: 12,
    marginBottom: 16,
  },
  editButtonsRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  // Subview edit styles
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    width: 100,
  },
  subTitle: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 10,
    color: '#000000',
    flex: 1,
    textAlign: 'right',
  },
  inputGroup: {
    marginBottom: 14,
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
  optionsRow: {
    flexDirection: 'row',
  },
  optionItem: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#000000',
    paddingVertical: 10,
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  optionItemVertical: {
    borderWidth: 2,
    borderColor: '#000000',
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'flex-start',
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  optionsRowVertical: {
    flexDirection: 'column',
  },
  optionActive: {
    backgroundColor: '#000000',
  },
  optionText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#000000',
  },
  optionTextActive: {
    color: '#FFFFFF',
  },
  editErrorBox: {
    borderWidth: 2,
    borderColor: '#000000',
    padding: 8,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  editErrorText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#000000',
    textAlign: 'center',
  },
  sectionHeading: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#000000',
    marginBottom: 8,
    textDecorationLine: 'underline',
  },
  checkboxPressable: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  checkboxText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#000000',
  },
});
