import { Pressable, StyleSheet, Text, View, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { useSfx } from '../../hooks/useSfx';

interface PixelButtonProps {
  onPress?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  sfxType?: 'beep' | 'blip' | 'levelup';
}

export default function PixelButton({
  onPress,
  children,
  disabled = false,
  variant = 'primary',
  style,
  textStyle,
  sfxType = 'beep',
}: PixelButtonProps) {
  const { playSfx } = useSfx();

  const handlePress = () => {
    if (disabled) return;
    playSfx(sfxType);
    if (onPress) onPress();
  };

  // Determine colors based on variant
  const getColors = () => {
    if (disabled) {
      return {
        bg: '#FFFFFF',
        text: '#888888',
        border: '#888888',
        shadow: '#E5E5E5',
      };
    }
    switch (variant) {
      case 'secondary':
        return {
          bg: '#E5E5E5',
          text: '#000000',
          border: '#000000',
          shadow: '#000000',
        };
      case 'danger':
        return {
          bg: '#FFFFFF',
          text: '#000000', // Monochrome style: danger can just be white/black but maybe text has double underline or exclamation
          border: '#000000',
          shadow: '#000000',
        };
      case 'primary':
      default:
        return {
          bg: '#FFFFFF',
          text: '#000000',
          border: '#000000',
          shadow: '#000000',
        };
    }
  };

  const colors = getColors();

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: colors.shadow },
        style,
      ]}
    >
      {({ pressed }) => {
        // Translate front card down-right when pressed to simulate a click
        const translateStyle = pressed && !disabled
          ? { transform: [{ translateX: 2 }, { translateY: 2 }] }
          : { transform: [{ translateX: 0 }, { translateY: 0 }] };

        return (
          <View
            style={[
              styles.frontCard,
              {
                backgroundColor: colors.bg,
                borderColor: colors.border,
              },
              translateStyle,
            ]}
          >
            {typeof children === 'string' ? (
              <Text
                style={[
                  styles.text,
                  { color: colors.text },
                  textStyle,
                ]}
              >
                {children.toUpperCase()}
              </Text>
            ) : (
              children
            )}
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 48,
    position: 'relative',
    // The background color acts as the 3D blocky shadow
  },
  frontCard: {
    position: 'absolute',
    left: -2,
    top: -2,
    width: '100%',
    height: '100%',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  text: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 10,
    textAlign: 'center',
  },
});
