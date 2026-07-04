import React from 'react';
import { StyleSheet, View, ViewStyle, Text, StyleProp } from 'react-native';

interface PixelProgressBarProps {
  progress: number; // 0 to 1
  segmentsCount?: number;
  style?: StyleProp<ViewStyle>;
  showPercentage?: boolean;
}

export default function PixelProgressBar({
  progress,
  segmentsCount = 10,
  style,
  showPercentage = false,
}: PixelProgressBarProps) {
  // Clamp progress between 0 and 1
  const clampedProgress = Math.max(0, Math.min(1, progress));
  
  // Calculate how many segments are active
  const activeSegments = Math.round(clampedProgress * segmentsCount);
  
  // Generate segments array
  const segments = Array.from({ length: segmentsCount });

  return (
    <View style={style}>
      <View style={styles.barContainer}>
        {segments.map((_, index) => {
          const isActive = index < activeSegments;
          return (
            <View
              key={index}
              style={[
                styles.segment,
                {
                  backgroundColor: isActive ? '#000000' : 'transparent',
                  borderRightWidth: index < segmentsCount - 1 ? 1 : 0,
                  borderRightColor: '#000000',
                },
              ]}
            />
          );
        })}
      </View>
      {showPercentage && (
        <Text style={styles.percentText}>
          {Math.round(clampedProgress * 100)}%
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  barContainer: {
    flexDirection: 'row',
    height: 18,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    height: '100%',
  },
  percentText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#000000',
    marginTop: 4,
    textAlign: 'right',
  },
});
