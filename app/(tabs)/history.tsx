import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, ActivityIndicator, Pressable } from 'react-native';
import { getDb } from '../../src/db/client';
import { generateMacroInsight, MacroInsightResult, MacroHistoryRecord } from '../../src/engine/macroInsight';
import { weightRepo, WeightLog } from '../../src/repositories/weightRepo';
import { useProfileStore } from '../../src/store/useProfileStore';
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
  mood: 'great' | 'good' | 'neutral' | 'bad' | 'terrible' | null;
  daily_note: string | null;
}

export default function History() {
  const { profile } = useProfileStore();
  
  const [historyRows, setHistoryRows] = useState<DailyHistoryRow[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [macroInsight, setMacroInsight] = useState<MacroInsightResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'trends' | 'weight'>('list');

  const loadData = async () => {
    setLoading(true);
    try {
      const db = await getDb();
      
      // 1. Load historical log rows joined with daily notes
      const rows = await db.getAllAsync<DailyHistoryRow>(
        `SELECT dh.*, dn.mood, dn.note as daily_note 
         FROM daily_history dh 
         LEFT JOIN daily_notes dn ON dh.log_date = dn.log_date 
         ORDER BY dh.log_date DESC LIMIT 30`
      );
      setHistoryRows(rows);

      // 2. Load weight logs
      const wLogs = await weightRepo.getWeightLogsAsc();
      setWeightLogs(wLogs);

      // 3. Generate macro insights (using past 7 days)
      if (profile) {
        const last7Days: MacroHistoryRecord[] = rows
          .slice(0, 7)
          .map((r) => ({
            total_carb_g: r.total_carb_g,
            total_protein_g: r.total_protein_g,
            total_fat_g: r.total_fat_g
          }))
          .reverse(); // Reverse so chronologically correct

        const insight = generateMacroInsight(
          profile.target_carb_g,
          profile.target_protein_g,
          profile.target_fat_g,
          last7Days
        );
        setMacroInsight(insight);
      }
    } catch (err) {
      console.error('Failed to load history data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile]);

  const getMoodEmoji = (mood: DailyHistoryRow['mood']) => {
    switch (mood) {
      case 'great': return ':-D';
      case 'good': return ':-)';
      case 'neutral': return ':-|';
      case 'bad': return ':-(';
      case 'terrible': return `:'(`;
      default: return null;
    }
  };

  const getMoodLabel = (mood: DailyHistoryRow['mood']) => {
    switch (mood) {
      case 'great': return 'LUAR BIASA';
      case 'good': return 'BAIK';
      case 'neutral': return 'BIASA AJA';
      case 'bad': return 'BURUK';
      case 'terrible': return 'SANGAT BURUK';
      default: return '';
    }
  };

  const renderMacroTrends = () => {
    if (!profile || historyRows.length === 0) {
      return (
        <PixelCard style={styles.tabCard}>
          <Text style={styles.noDataText}>BELUM ADA DATA MAKANAN UNTUK DIANALISIS.</Text>
        </PixelCard>
      );
    }

    const last7Rows = historyRows.slice(0, 7).reverse();

    return (
      <View style={styles.trendsContainer}>
        {/* Trend Bar Chart */}
        <PixelCard style={styles.chartCard}>
          <Text style={styles.chartTitle}>TREN ASUPAN MAKRO (7 HARI)</Text>
          
          <View style={styles.chartCanvas}>
            {last7Rows.map((row, index) => {
              // Calculate percentages of targets
              const pctCarb = Math.min(100, (row.total_carb_g / profile.target_carb_g) * 100);
              const pctProt = Math.min(100, (row.total_protein_g / profile.target_protein_g) * 100);
              const pctFat = Math.min(100, (row.total_fat_g / profile.target_fat_g) * 100);

              const dateLabel = row.log_date.substring(8, 10) + '/' + row.log_date.substring(5, 7);

              return (
                <View key={row.log_date} style={styles.chartColumn}>
                  <View style={styles.barGroup}>
                    {/* Carb Bar */}
                    <View style={[styles.barItem, { height: `${pctCarb}%`, backgroundColor: '#000000' }]} />
                    {/* Protein Bar */}
                    <View style={[styles.barItem, { height: `${pctProt}%`, backgroundColor: '#666666' }]} />
                    {/* Fat Bar */}
                    <View style={[styles.barItem, { height: `${pctFat}%`, backgroundColor: '#CCCCCC' }]} />
                  </View>
                  <Text style={styles.chartDateLabel}>{dateLabel}</Text>
                </View>
              );
            })}
          </View>

          {/* Chart Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: '#000000' }]} />
              <Text style={styles.legendText}>KARBO</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: '#666666' }]} />
              <Text style={styles.legendText}>PROT</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: '#CCCCCC' }]} />
              <Text style={styles.legendText}>LEMAK</Text>
            </View>
          </View>
        </PixelCard>

        {/* Weekly Insights */}
        {macroInsight && (
          <View style={styles.insightsList}>
            <Text style={styles.insightHeader}>👾 EVALUASI DAN REKOMENDASI:</Text>
            
            <PixelCard style={styles.insightCard}>
              <Text style={styles.insightLabel}>🍞 ANALISIS KARBOHIDRAT:</Text>
              <Text style={styles.insightDesc}>{macroInsight.carbInsight}</Text>
            </PixelCard>

            <PixelCard style={styles.insightCard}>
              <Text style={styles.insightLabel}>🍗 ANALISIS PROTEIN:</Text>
              <Text style={styles.insightDesc}>{macroInsight.proteinInsight}</Text>
            </PixelCard>

            <PixelCard style={styles.insightCard}>
              <Text style={styles.insightLabel}>🥑 ANALISIS LEMAK:</Text>
              <Text style={styles.insightDesc}>{macroInsight.fatInsight}</Text>
            </PixelCard>
          </View>
        )}
      </View>
    );
  };

  const renderWeightTrends = () => {
    if (weightLogs.length === 0) {
      return (
        <PixelCard style={styles.tabCard}>
          <Text style={styles.noDataText}>BELUM ADA CATATAN BERAT BADAN.</Text>
          <Text style={styles.emptySubText}>Timbang badan Anda melalui menu Pengaturan/Dashboard untuk mencatat berat baru.</Text>
        </PixelCard>
      );
    }

    // Limit to last 10 weigh-ins
    const displayLogs = weightLogs.slice(-10);

    const weights = displayLogs.map((l) => l.weight_kg);
    const maxW = Math.max(...weights);
    const minW = Math.max(0, Math.min(...weights) - 5);
    const range = maxW - minW || 10;

    return (
      <View style={styles.trendsContainer}>
        <PixelCard style={styles.chartCard}>
          <Text style={styles.chartTitle}>TREN BERAT BADAN (KG)</Text>
          
          <View style={[styles.chartCanvas, { height: 120 }]}>
            {displayLogs.map((log) => {
              // Calculate relative bar height
              const heightPct = Math.max(10, ((log.weight_kg - minW) / range) * 100);
              const dateLabel = log.log_date.substring(8, 10) + '/' + log.log_date.substring(5, 7);

              return (
                <View key={log.id} style={styles.chartColumn}>
                  <Text style={styles.weightBarVal}>{log.weight_kg}</Text>
                  <View style={styles.barGroupSingle}>
                    <View style={[styles.singleBar, { height: `${heightPct}%`, backgroundColor: '#000000' }]} />
                  </View>
                  <Text style={styles.chartDateLabel}>{dateLabel}</Text>
                </View>
              );
            })}
          </View>
          
          <Text style={styles.emptySubText}>MENAMPILKAN MAKSIMAL 10 TIMBANGAN TERAKHIR</Text>
        </PixelCard>
      </View>
    );
  };

  const renderListHistory = () => {
    return (
      <View>
        {historyRows.length === 0 ? (
          <PixelCard>
            <Text style={styles.emptyText}>BELUM ADA RIWAYAT DIKUNCI.</Text>
            <Text style={styles.emptySubText}>
              DATA HARIAN AKAN DIKUNCI & DISIMPAN DI SINI SAAT MEMASUKI HARI BARU.
            </Text>
          </PixelCard>
        ) : (
          historyRows.map((row) => {
            const calProgress = row.total_calorie / row.target_calorie;
            const moodEmoji = getMoodEmoji(row.mood);
            
            return (
              <PixelCard key={row.log_date} style={styles.historyCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.dateText}>{row.log_date}</Text>
                    {moodEmoji && (
                      <Text style={styles.moodLabel}>
                        MOOD: {moodEmoji} {getMoodLabel(row.mood)}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.taskText}>
                    TUGAS: {row.activity_completed_count}/{row.activity_total_count}
                  </Text>
                </View>

                {row.daily_note ? (
                  <View style={styles.noteBox}>
                    <Text style={styles.noteLabel}>CATATAN HARIAN:</Text>
                    <Text style={styles.noteText}>"{row.daily_note}"</Text>
                  </View>
                ) : null}

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
    );
  };

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

          {/* Sub Navigation Tabs */}
          <View style={styles.tabsRow}>
            <Pressable
              onPress={() => setActiveTab('list')}
              style={[styles.tabButton, activeTab === 'list' ? styles.activeTab : null]}
            >
              <Text style={[styles.tabText, activeTab === 'list' ? styles.activeTabText : null]}>RIWAYAT</Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('trends')}
              style={[styles.tabButton, activeTab === 'trends' ? styles.activeTab : null]}
            >
              <Text style={[styles.tabText, activeTab === 'trends' ? styles.activeTabText : null]}>ASUPAN</Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('weight')}
              style={[styles.tabButton, activeTab === 'weight' ? styles.activeTab : null]}
            >
              <Text style={[styles.tabText, activeTab === 'weight' ? styles.activeTabText : null]}>BERAT BB</Text>
            </Pressable>
          </View>

          {activeTab === 'list' && renderListHistory()}
          {activeTab === 'trends' && renderMacroTrends()}
          {activeTab === 'weight' && renderWeightTrends()}
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
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 14,
    color: '#000000',
  },
  tabsRow: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: '#000000',
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  activeTab: {
    backgroundColor: '#000000',
  },
  tabText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#000000',
  },
  activeTabText: {
    color: '#FFFFFF',
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
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    paddingBottom: 10,
    marginBottom: 12,
  },
  dateText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 10,
    color: '#000000',
  },
  moodLabel: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 7,
    color: '#000000',
    marginTop: 6,
  },
  taskText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 7,
    color: '#888888',
  },
  noteBox: {
    borderWidth: 2,
    borderColor: '#000000',
    padding: 8,
    backgroundColor: '#F3F3F3',
    marginBottom: 12,
  },
  noteLabel: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#888888',
    marginBottom: 4,
  },
  noteText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 7,
    color: '#000000',
    lineHeight: 12,
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
    borderWidth: 2,
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
  // Trends Styles
  tabCard: {
    padding: 16,
  },
  noDataText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: 12,
  },
  trendsContainer: {
    flex: 1,
  },
  chartCard: {
    padding: 16,
    marginBottom: 20,
  },
  chartTitle: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
  },
  chartCanvas: {
    height: 100,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    paddingBottom: 6,
    marginBottom: 12,
  },
  chartColumn: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: 24,
    height: '100%',
  },
  barItem: {
    width: 6,
    minHeight: 2,
  },
  chartDateLabel: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#888888',
    marginTop: 6,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  legendBox: {
    width: 8,
    height: 8,
    borderWidth: 1,
    borderColor: '#000000',
    marginRight: 4,
  },
  legendText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 7,
    color: '#000000',
  },
  insightsList: {
    marginBottom: 20,
  },
  insightHeader: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 9,
    color: '#000000',
    marginBottom: 12,
  },
  insightCard: {
    marginBottom: 12,
    padding: 12,
  },
  insightLabel: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#000000',
    marginBottom: 6,
  },
  insightDesc: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 7,
    color: '#888888',
    lineHeight: 12,
  },
  // Weight Chart Styles
  weightBarVal: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#000000',
    marginBottom: 4,
  },
  barGroupSingle: {
    width: 16,
    height: '70%',
    justifyContent: 'flex-end',
  },
  singleBar: {
    width: 16,
    minHeight: 4,
  },
});
