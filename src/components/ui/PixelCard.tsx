import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';

interface PixelCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
  hasShadow?: boolean;
}

export default function PixelCard({
  children,
  style,
  innerStyle,
  hasShadow = true,
}: PixelCardProps) {
  if (!hasShadow) {
    return (
      <View style={[styles.card, style]}>
        <View style={[styles.inner, innerStyle]}>{children}</View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Shadow layer */}
      <View style={styles.shadow} />
      
      {/* Card content layer */}
      <View style={[styles.card, styles.offsetCard]}>
        <View style={[styles.inner, innerStyle]}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 4,
    marginRight: 4,
  },
  shadow: {
    position: 'absolute',
    left: 4,
    top: 4,
    right: -4,
    bottom: -4,
    backgroundColor: '#000000',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
  },
  offsetCard: {
    position: 'relative',
  },
  inner: {
    padding: 16,
  },
});
