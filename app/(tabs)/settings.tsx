import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../../src/store/useSettingsStore';
import { useProfileStore } from '../../src/store/useProfileStore';
import { useDashboardStore } from '../../src/store/useDashboardStore';
import { exportBackup, importBackup } from '../../src/utils/backupExport';
import { getDb } from '../../src/db/client';
import PixelButton from '../../src/components/ui/PixelButton';
import PixelCard from '../../src/components/ui/PixelCard';
import { useSfx } from '../../src/hooks/useSfx';

export default function Settings() {
  const router = useRouter();
  const { soundEffectsEnabled, toggleSoundEffects } = useSettingsStore();
  const { profile, resetProfile, fetchProfile } = useProfileStore();
  const { loadDailyData } = useDashboardStore();
  const { playSfx } = useSfx();

  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

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
      // Reload Zustand stores
      await fetchProfile();
      await loadDailyData();
      playSfx('levelup');
      showStatus('IMPOR BACKUP BERHASIL! DATA TELAH DIPULIHKAN.');
    } else if (result.errorMsg) {
      showStatus(`IMPOR GAGAL: ${result.errorMsg.toUpperCase()}`, true);
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
              // Reset all data in database
              await db.withTransactionAsync(async () => {
                await db.runAsync('DELETE FROM user_profile');
                await db.runAsync('DELETE FROM user_food_restrictions');
                await db.runAsync('DELETE FROM food_logs');
                await db.runAsync('DELETE FROM water_logs');
                await db.runAsync('DELETE FROM activity_checklist_daily');
                await db.runAsync('DELETE FROM daily_history');
                await db.runAsync('DELETE FROM app_state');
                
                // Delete custom food items and dependencies
                await db.runAsync('DELETE FROM food_portion_units WHERE food_item_id IN (SELECT id FROM food_items WHERE is_custom = 1)');
                await db.runAsync('DELETE FROM food_item_tags WHERE food_item_id IN (SELECT id FROM food_items WHERE is_custom = 1)');
                await db.runAsync('DELETE FROM food_items WHERE is_custom = 1');
              });

              // Reset Zustand profile store
              await resetProfile();
              
              // Play beep
              playSfx('beep');
              
              // Redirect to onboarding
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

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>PENGATURAN</Text>
          </View>

          {message ? (
            <View style={[styles.statusBox, isError ? styles.errorBox : null]}>
              <Text style={styles.statusText}>{message}</Text>
            </View>
          ) : null}

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
            </PixelCard>
          )}

          {/* Sound settings card */}
          <PixelCard style={styles.card}>
            <Text style={styles.sectionTitle}>SISTEM & SUARA</Text>
            <PixelButton
              variant={soundEffectsEnabled ? 'secondary' : 'primary'}
              onPress={toggleSoundEffects}
              style={styles.toggleBtn}
            >
              {soundEffectsEnabled ? '[X] EFEK SUARA: AKTIF' : '[ ] EFEK SUARA: MATI'}
            </PixelButton>
          </PixelCard>

          {/* Backup settings card */}
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

          {/* Danger zone card */}
          <PixelCard style={styles.card}>
            <Text style={styles.sectionTitle}>DANGER ZONE</Text>
            <PixelButton variant="danger" onPress={handleResetApp} style={styles.btn}>
              RESET SEMUA DATA APLIKASI
            </PixelButton>
          </PixelCard>

          {/* About App Card */}
          <PixelCard style={styles.card}>
            <Text style={styles.sectionTitle}>TENTANG APLIKASI</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>APLIKASI:</Text>
              <Text style={styles.infoVal}>RETRO CALORIE TRACKER</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>VERSI:</Text>
              <Text style={styles.infoVal}>1.0.0 (8-BIT MONO)</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>PEMBUAT:</Text>
              <Text style={[styles.infoVal, { fontSize: 6.5, flex: 1, textAlign: 'right' }]} numberOfLines={2}>
                MOCHAMMAD BAYU ADHIE NUGROHO
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ENGINE:</Text>
              <Text style={styles.infoVal}>EXPO ROUTER & SQLITE</Text>
            </View>
            <Text style={[styles.descText, { marginTop: 12, marginBottom: 0, textAlign: 'center', fontSize: 6 }]}>
              © 2026 MOCHAMMAD BAYU ADHIE NUGROHO. ALL RIGHTS RESERVED.
            </Text>
          </PixelCard>
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
  statusBox: {
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
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
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 7,
    color: '#888888',
  },
  infoVal: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 7,
    color: '#000000',
  },
  descText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 7,
    color: '#888888',
    lineHeight: 12,
    marginBottom: 16,
  },
  toggleBtn: {
    height: 40,
  },
  btn: {
    height: 40,
  },
});
