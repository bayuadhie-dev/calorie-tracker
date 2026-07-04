import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useProfileStore } from '../../src/store/useProfileStore';
import PixelButton from '../../src/components/ui/PixelButton';
import PixelCard from '../../src/components/ui/PixelCard';

type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

interface ActivityOption {
  value: ActivityLevel;
  title: string;
  desc: string;
}

export default function Step3Activity() {
  const router = useRouter();
  const { onboardingTemp, updateOnboardingTemp } = useProfileStore();
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    onboardingTemp.activity_level || 'moderate'
  );

  const activities: ActivityOption[] = [
    {
      value: 'sedentary',
      title: 'SEDENTARY',
      desc: 'JARANG OLAHRAGA / KERJA KANTORAN (REBAHAN).',
    },
    {
      value: 'light',
      title: 'LIGHT ACTIVE',
      desc: 'OLAHRAGA RINGAN 1-3 KALI SEMINGGU.',
    },
    {
      value: 'moderate',
      title: 'MODERATE ACTIVE',
      desc: 'OLAHRAGA SEDANG 3-5 KALI SEMINGGU.',
    },
    {
      value: 'active',
      title: 'VERY ACTIVE',
      desc: 'OLAHRAGA BERAT 6-7 KALI SEMINGGU.',
    },
    {
      value: 'very_active',
      title: 'EXTRA ACTIVE',
      desc: 'OLAHRAGA SANGAT BERAT / PEKERJA FISIK KELAS BERAT.',
    },
  ];

  const handleNext = () => {
    updateOnboardingTemp({ activity_level: activityLevel });
    router.push('/(onboarding)/step-4-preferences');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.container}>
          <Text style={styles.stepTitle}>STEP 3 / 4</Text>
          <Text style={styles.title}>TINGKAT AKTIVITAS</Text>

          <View style={styles.optionsContainer}>
            {activities.map((act) => {
              const selected = activityLevel === act.value;
              return (
                <PixelCard
                  key={act.value}
                  style={[
                    styles.actCard,
                    selected ? styles.selectedCard : null,
                  ]}
                  innerStyle={{ padding: 12 }}
                >
                  <View style={styles.actCardContent}>
                    <Text style={[styles.actTitle, selected ? styles.selectedText : null]}>
                      {selected ? '[X] ' : '[ ] '}
                      {act.title}
                    </Text>
                    <Text style={[styles.actDesc, selected ? styles.selectedText : null]}>
                      {act.desc}
                    </Text>
                    <PixelButton
                      variant={selected ? 'secondary' : 'primary'}
                      style={styles.selectBtn}
                      onPress={() => setActivityLevel(act.value)}
                    >
                      {selected ? 'TERPILIH' : 'PILIH'}
                    </PixelButton>
                  </View>
                </PixelCard>
              );
            })}
          </View>

          <View style={styles.navigationRow}>
            <PixelButton
              variant="secondary"
              style={styles.backButton}
              onPress={() => router.back()}
            >
              {"<- KEMBALI"}
            </PixelButton>
            <View style={{ width: 12 }} />
            <PixelButton
              style={styles.nextButton}
              onPress={handleNext}
            >
              {"LANJUT ->"}
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
    marginBottom: 24,
    lineHeight: 24,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  actCard: {
    marginBottom: 16,
  },
  selectedCard: {
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  actCardContent: {
    flexDirection: 'column',
  },
  actTitle: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 10,
    color: '#000000',
    marginBottom: 6,
  },
  actDesc: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#888888',
    lineHeight: 14,
    marginBottom: 12,
  },
  selectedText: {
    color: '#000000',
  },
  selectBtn: {
    height: 36,
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
