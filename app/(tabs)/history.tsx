import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { getDb } from '../../src/db/client';
import PixelCard from '../../src/components/ui/PixelCard';
import PixelProgressBar from '../../src/components/ui/PixelProgressBar';

interface DailyHistoryRow {
  log_date: string;
  total_calorie: number;
  total_carb_g: number;
  total_protein_g: number;
  total_fat_g: number;
  total_water_ml: number;
  target_calorie: number;
  activity_completed_count: number;
  activity_total_count: number;
  locked_at: string;
}

export default function History() {
  const [historyRows, setHistoryRows] = useState<DailyHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<DailyHistoryRow>(
        'SELECT * FROM daily_history ORDER BY log_date DESC LIMIT 30'
      );
      setHistoryRows(rows);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  // Reload history when screen is focused
  useEffect(() => {
    loadHistory();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>LOADING HISTORY...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>RIWAYAT HARIAN</Text>
          </View>

          {historyRows.length === 0 ? (
            <PixelCard>
              <Text style={styles.emptyText}>
                BELUM ADA RIWAYAT DIKUNCI.
              </Text>
              <Text style={styles.emptySubText}>
                DATA HARIAN AKAN DIKUNCI & DISIMPAN DI SINI SAAT MEMASUKI HARI BARU.
              </Text>
            </PixelCard>
          ) : (
            historyRows.map((row) => {
              const calProgress = row.total_calorie / row.target_calorie;
              
              return (
                <PixelCard key={row.log_date} style={styles.historyCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.dateText}>{row.log_date}</Text>
                    <Text style={styles.taskText}>
                      TUGAS: {row.activity_completed_count}/{row.activity_total_count}
                    </Text>
                  </View>

                  <View style={styles.calorieRow}>
                    <Text style={styles.label}>KALORI:</Text>
                    <Text style={styles.value}>
                      {row.total_calorie}/{row.target_calorie} KCAL
                    </Text>
                  </View>
                  <PixelProgressBar progress={calProgress} style={styles.bar} />

                  <View style={styles.macrosRow}>
                    <Text style={styles.macroText}>K: {row.total_carb_g}G</Text>
                    <Text style={styles.macroText}>P: {row.total_protein_g}G</Text>
                    <Text style={styles.macroText}>L: {row.total_fat_g}G</Text>
                  </View>

                  <View style={styles.waterRow}>
                    <Text style={styles.label}>AIR MINUM:</Text>
                    <Text style={styles.value}>
                      {row.total_water_ml} ML
                    </Text>
                  </View>
                </PixelCard>
              );
            })
          )}
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
    marginBottom: 20,
  },
  headerTitle: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 14,
    color: '#000000',
  },
  emptyText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 9,
    color: '#000000',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 7,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 14,
  },
  historyCard: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 8,
    marginBottom: 12,
  },
  dateText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 10,
    color: '#000000',
  },
  taskText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 7,
    color: '#888888',
  },
  calorieRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#888888',
  },
  value: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#000000',
  },
  bar: {
    marginBottom: 12,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F3F3F3',
    padding: 6,
    borderWidth: 1,
    borderColor: '#000000',
    marginBottom: 12,
  },
  macroText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 7,
    color: '#000000',
  },
  waterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
