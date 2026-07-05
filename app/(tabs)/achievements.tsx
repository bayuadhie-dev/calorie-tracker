import React, { useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { useAchievementStore } from '../../src/store/useAchievementStore';
import PixelCard from '../../src/components/ui/PixelCard';
import PixelProgressBar from '../../src/components/ui/PixelProgressBar';

export default function AchievementsScreen() {
  const { definitions, unlocked, loading, fetchAchievements } = useAchievementStore();

  useEffect(() => {
    fetchAchievements();
  }, []);

  if (loading && definitions.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>LOADING BADGES...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Create a map of unlocked codes for quick lookup
  const unlockedMap = new Map<string, typeof unlocked[0]>();
  unlocked.forEach((u) => unlockedMap.set(u.achievement_code, u));

  const totalBadges = definitions.length || 17;
  const unlockedCount = unlocked.length;
  const progressPct = unlockedCount / totalBadges;

  // Group definitions by category
  const categories = {
    weight: { label: '⚖️ BERAT BADAN', items: [] as typeof definitions },
    streak: { label: '🔥 STREAK MAKAN', items: [] as typeof definitions },
    hydration: { label: '💧 HIDRASI AIR', items: [] as typeof definitions },
    consistency: { label: '📅 KONSISTENSI', items: [] as typeof definitions },
  };

  definitions.forEach((d) => {
    if (categories[d.category]) {
      categories[d.category].items.push(d);
    }
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>PRESTASI / BADGE</Text>
            <Text style={styles.headerSubtitle}>SELESAIKAN TANTANGAN & BUKA BADGE!</Text>
          </View>

          {/* Progress Card */}
          <PixelCard style={styles.progressCard}>
            <Text style={styles.progressText}>
              TERBUKA: {unlockedCount} / {totalBadges} BADGE
            </Text>
            <PixelProgressBar progress={progressPct} style={styles.progressBar} />
          </PixelCard>

          {/* Categories & Badges Grid */}
          {Object.entries(categories).map(([catKey, cat]) => (
            <View key={catKey} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{cat.label}</Text>
              
              <View style={styles.grid}>
                {cat.items.map((badge) => {
                  const unlockData = unlockedMap.get(badge.code);
                  const isUnlocked = !!unlockData;

                  return (
                    <PixelCard
                      key={badge.code}
                      style={[
                        styles.badgeCard,
                        isUnlocked ? styles.unlockedCard : styles.lockedCard
                      ]}
                      innerStyle={{ padding: 12 }}
                      hasShadow={isUnlocked}
                    >
                      <View style={styles.badgeRow}>
                        <Text style={styles.badgeIcon}>
                          {isUnlocked ? '⭐' : '🔒'}
                        </Text>
                        
                        <View style={{ flex: 1 }}>
                          <Text style={[
                            styles.badgeLabel,
                            isUnlocked ? styles.unlockedText : styles.lockedText
                          ]}>
                            {badge.label.toUpperCase()}
                          </Text>
                          <Text style={[
                            styles.badgeDesc,
                            isUnlocked ? styles.unlockedDesc : styles.lockedDesc
                          ]}>
                            {badge.description.toUpperCase()}
                          </Text>
                          
                          {isUnlocked && unlockData && (
                            <Text style={styles.unlockedDate}>
                              BUKA: {unlockData.unlocked_at.substring(0, 10)} 
                              {unlockData.value_at_unlock !== null ? ` (${unlockData.value_at_unlock} KG)` : ''}
                            </Text>
                          )}
                        </View>
                      </View>
                    </PixelCard>
                  );
                })}
              </View>
            </View>
          ))}
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
    marginBottom: 6,
  },
  headerSubtitle: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 7,
    color: '#888888',
    lineHeight: 12,
  },
  progressCard: {
    marginBottom: 24,
    padding: 12,
  },
  progressText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#000000',
    marginBottom: 8,
  },
  progressBar: {
    height: 12,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 9,
    color: '#000000',
    marginBottom: 12,
    textDecorationLine: 'underline',
  },
  grid: {
    flexDirection: 'column',
  },
  badgeCard: {
    marginBottom: 12,
  },
  unlockedCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#000000',
  },
  lockedCard: {
    backgroundColor: '#F3F3F3',
    borderColor: '#888888',
    borderStyle: 'dashed',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  badgeIcon: {
    fontSize: 16,
    marginRight: 12,
    marginTop: 2,
  },
  badgeLabel: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 4,
    lineHeight: 12,
  },
  unlockedText: {
    color: '#000000',
  },
  lockedText: {
    color: '#888888',
  },
  badgeDesc: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    lineHeight: 12,
    marginBottom: 6,
  },
  unlockedDesc: {
    color: '#333333',
  },
  lockedDesc: {
    color: '#888888',
  },
  unlockedDate: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 7,
    color: '#666666',
  },
});
