import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useProfileStore } from '../../src/store/useProfileStore';
import PixelButton from '../../src/components/ui/PixelButton';
import PixelCard from '../../src/components/ui/PixelCard';

type Goal = 'diet' | 'maintenance' | 'surplus';

export default function Step2Goal() {
  const router = useRouter();
  const { onboardingTemp, updateOnboardingTemp } = useProfileStore();
  const [goal, setGoal] = useState<Goal>(onboardingTemp.goal || 'maintenance');

  const handleNext = () => {
    updateOnboardingTemp({ goal });
    router.push('/(onboarding)/step-3-activity');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.container}>
          <Text style={styles.stepTitle}>STEP 2 / 4</Text>
          <Text style={styles.title}>PILIH TARGET DIET</Text>

          <View style={styles.optionsContainer}>
            {/* Diet */}
            <PressableGoalCard
              title="DIET (DEFISIT)"
              desc="UNTUK MENURUNKAN BERAT BADAN."
              selected={goal === 'diet'}
              onPress={() => setGoal('diet')}
            />

            {/* Maintenance */}
            <PressableGoalCard
              title="MAINTENANCE"
              desc="UNTUK MEMPERTAHANKAN BERAT BADAN SAAT INI."
              selected={goal === 'maintenance'}
              onPress={() => setGoal('maintenance')}
            />

            {/* Surplus */}
            <PressableGoalCard
              title="SURPLUS (BULKING)"
              desc="UNTUK MENINGKATKAN MASSA OTOT & BERAT BADAN."
              selected={goal === 'surplus'}
              onPress={() => setGoal('surplus')}
            />
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

interface PressableCardProps {
  title: string;
  desc: string;
  selected: boolean;
  onPress: () => void;
}

function PressableGoalCard({ title, desc, selected, onPress }: PressableCardProps) {
  return (
    <PixelCard
      style={[
        styles.goalCard,
        selected ? styles.selectedCard : null,
      ]}
      innerStyle={{ padding: 12 }}
    >
      <View style={styles.goalCardContent}>
        <Text style={[styles.goalTitle, selected ? styles.selectedText : null]}>
          {selected ? '[X] ' : '[ ] '}
          {title}
        </Text>
        <Text style={[styles.goalDesc, selected ? styles.selectedText : null]}>
          {desc}
        </Text>
        <PixelButton
          variant={selected ? 'secondary' : 'primary'}
          style={styles.selectBtn}
          onPress={onPress}
        >
          {selected ? 'TERPILIH' : 'PILIH'}
        </PixelButton>
      </View>
    </PixelCard>
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
  goalCard: {
    marginBottom: 16,
  },
  selectedCard: {
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  goalCardContent: {
    flexDirection: 'column',
  },
  goalTitle: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 11,
    color: '#000000',
    marginBottom: 6,
  },
  goalDesc: {
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
