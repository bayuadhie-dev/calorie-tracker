import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useProfileStore } from '../../src/store/useProfileStore';
import PixelButton from '../../src/components/ui/PixelButton';
import PixelCard from '../../src/components/ui/PixelCard';

export default function Step1Biodata() {
  const router = useRouter();
  const { onboardingTemp, updateOnboardingTemp } = useProfileStore();

  const [weight, setWeight] = useState(onboardingTemp.weight_kg?.toString() || '');
  const [targetWeight, setTargetWeight] = useState(onboardingTemp.target_weight_kg?.toString() || '');
  const [height, setHeight] = useState(onboardingTemp.height_cm?.toString() || '');
  const [age, setAge] = useState(onboardingTemp.age?.toString() || '');
  const [gender, setGender] = useState<'male' | 'female'>(onboardingTemp.gender || 'male');

  const [error, setError] = useState('');

  const handleNext = () => {
    const w = parseFloat(weight);
    const tw = parseFloat(targetWeight);
    const h = parseFloat(height);
    const a = parseInt(age, 10);

    if (isNaN(w) || w <= 0) {
      setError('BERAT BADAN HARUS VALID!');
      return;
    }
    if (isNaN(tw) || tw <= 0) {
      setError('TARGET BERAT BADAN HARUS VALID!');
      return;
    }
    if (isNaN(h) || h <= 0) {
      setError('TINGGI BADAN HARUS VALID!');
      return;
    }
    if (isNaN(a) || a <= 0 || a > 120) {
      setError('UMUR HARUS VALID (1-120)!');
      return;
    }

    setError('');
    updateOnboardingTemp({
      weight_kg: w,
      target_weight_kg: tw,
      height_cm: h,
      age: a,
      gender,
    });

    router.push('/(onboarding)/step-2-goal');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.container}>
            <Text style={styles.stepTitle}>STEP 1 / 4</Text>
            <Text style={styles.title}>BIODATA KAMU</Text>
            
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>* {error} *</Text>
              </View>
            ) : null}

            <PixelCard style={styles.card}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>BERAT BADAN (KG):</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="MISAL: 70"
                  placeholderTextColor="#888888"
                  value={weight}
                  onChangeText={(text) => setWeight(text.replace(/[^0-9.]/g, ''))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>TARGET BERAT BADAN (KG):</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="MISAL: 65"
                  placeholderTextColor="#888888"
                  value={targetWeight}
                  onChangeText={(text) => setTargetWeight(text.replace(/[^0-9.]/g, ''))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>TINGGI BADAN (CM):</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="MISAL: 170"
                  placeholderTextColor="#888888"
                  value={height}
                  onChangeText={(text) => setHeight(text.replace(/[^0-9.]/g, ''))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>UMUR (TAHUN):</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="MISAL: 25"
                  placeholderTextColor="#888888"
                  value={age}
                  onChangeText={(text) => setAge(text.replace(/[^0-9]/g, ''))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>JENIS KELAMIN:</Text>
                <View style={styles.genderRow}>
                  <PixelButton
                    variant={gender === 'male' ? 'secondary' : 'primary'}
                    style={styles.genderButton}
                    onPress={() => setGender('male')}
                  >
                    LAKI-LAKI
                  </PixelButton>
                  <View style={{ width: 10 }} />
                  <PixelButton
                    variant={gender === 'female' ? 'secondary' : 'primary'}
                    style={styles.genderButton}
                    onPress={() => setGender('female')}
                  >
                    PEREMPUAN
                  </PixelButton>
                </View>
              </View>
            </PixelCard>

            <PixelButton style={styles.nextButton} onPress={handleNext}>
              {"LANJUT ->"}
            </PixelButton>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoid: {
    flex: 1,
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
  card: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 9,
    color: '#000000',
    marginBottom: 8,
    lineHeight: 14,
  },
  input: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 10,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    height: 40,
    paddingHorizontal: 12,
    paddingVertical: 0,
    color: '#000000',
  },
  genderRow: {
    flexDirection: 'row',
  },
  genderButton: {
    flex: 1,
  },
  nextButton: {
    marginTop: 8,
  },
});
