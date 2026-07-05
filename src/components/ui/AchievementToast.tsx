import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, Animated } from 'react-native';
import PixelCard from './PixelCard';

interface AchievementToastProps {
  label: string;
  description: string;
  onDismiss: () => void;
}

export default function AchievementToast({ label, description, onDismiss }: AchievementToastProps) {
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Auto dismiss after 4 seconds
    const timer = setTimeout(() => {
      handleDismiss();
    }, 4500);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Pressable onPress={handleDismiss}>
        <PixelCard style={styles.card} innerStyle={{ padding: 12 }}>
          <View style={styles.content}>
            <Text style={styles.header}>✨ LEVEL UP / PRESTASI BARU! ✨</Text>
            <Text style={styles.title}>{label.toUpperCase()}</Text>
            <Text style={styles.desc}>{description.toUpperCase()}</Text>
            <Text style={styles.dismissHint}>TAP UNTUK TUTUP</Text>
          </View>
        </PixelCard>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 9999,
    elevation: 9999,
  },
  card: {
    backgroundColor: '#000000',
    borderColor: '#FFFFFF',
    borderWidth: 2,
  },
  content: {
    alignItems: 'center',
  },
  header: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  title: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  desc: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 7,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 12,
    marginBottom: 8,
  },
  dismissHint: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 7,
    color: '#888888',
    textAlign: 'center',
  },
});
