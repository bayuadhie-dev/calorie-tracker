import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useProfileStore } from '../../src/store/useProfileStore';
import { foodRepo, RestrictionTag } from '../../src/repositories/foodRepo';
import { useDashboardStore } from '../../src/store/useDashboardStore';
import PixelButton from '../../src/components/ui/PixelButton';
import PixelCard from '../../src/components/ui/PixelCard';
import { useSfx } from '../../src/hooks/useSfx';

export default function Step4Preferences() {
  const router = useRouter();
  const { onboardingTemp, updateOnboardingTemp, saveProfileFromOnboarding } = useProfileStore();
  const { loadDailyData } = useDashboardStore();
  const { playSfx } = useSfx();

  const [tags, setTags] = useState<RestrictionTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(
    onboardingTemp.restrictionTagIds || []
  );
  const [dbLoading, setDbLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadTags() {
      try {
        const data = await foodRepo.getRestrictionTags();
        setTags(data);
      } catch (err) {
        console.error('Failed to load restriction tags:', err);
      } finally {
        setDbLoading(false);
      }
    }
    loadTags();
  }, []);

  const toggleTag = (id: number) => {
    playSfx('beep');
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((tId) => tId !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    
    // Save selections to temp store first
    updateOnboardingTemp({ restrictionTagIds: selectedTagIds });

    try {
      // Execute the profile creation & calculation engine save
      await saveProfileFromOnboarding();
      
      // Load initial daily data (such as auto-generated checklist)
      await loadDailyData();

      // Play levelup sound for successful registration
      playSfx('levelup');

      // Redirect to dashboard
      router.replace('/(tabs)/dashboard');
    } catch (err) {
      console.error(err);
      setError('GAGAL MENYIMPAN DATA PROFIL!');
      setSaving(false);
    }
  };

  if (dbLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.container}>
          <Text style={styles.stepTitle}>STEP 4 / 4</Text>
          <Text style={styles.title}>PREFERENSI MAKANAN</Text>
          <Text style={styles.subtitle}>PILIH PANTANGAN / DIET ANDA:</Text>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>* {error} *</Text>
            </View>
          ) : null}

          <View style={styles.optionsContainer}>
            {tags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);
              return (
                <Pressable
                  key={tag.id}
                  onPress={() => toggleTag(tag.id)}
                  style={styles.checkboxPressable}
                >
                  <PixelCard
                    style={[
                      styles.checkboxCard,
                      isSelected ? styles.selectedCard : null,
                    ]}
                    innerStyle={{ padding: 12 }}
                    hasShadow={false}
                  >
                    <View style={styles.checkboxRow}>
                      <Text style={[styles.checkboxText, isSelected ? styles.selectedText : null]}>
                        {isSelected ? '[X]' : '[ ]'}
                      </Text>
                      <Text style={[styles.label, isSelected ? styles.selectedText : null]}>
                        {tag.label.toUpperCase()}
                      </Text>
                    </View>
                  </PixelCard>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.navigationRow}>
            <PixelButton
              variant="secondary"
              style={styles.backButton}
              onPress={() => router.back()}
              disabled={saving}
            >
              {"<- KEMBALI"}
            </PixelButton>
            <View style={{ width: 12 }} />
            <PixelButton
              style={styles.nextButton}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? 'SAVING...' : 'SIMPAN SELESAI'}
            </PixelButton>
          </View>
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
    padding: 24,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 10,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 18,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  subtitle: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: 24,
  },
  errorContainer: {
    borderWidth: 2,
    borderColor: '#000000',
    padding: 8,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  errorText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#000000',
    textAlign: 'center',
  },
  optionsContainer: {
    marginBottom: 24,
  },
  checkboxPressable: {
    marginBottom: 12,
  },
  checkboxCard: {
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
  label: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 9,
    color: '#000000',
    flex: 1,
    lineHeight: 14,
  },
  selectedText: {
    color: '#000000',
  },
  navigationRow: {
    flexDirection: 'row',
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 1,
  },
});
