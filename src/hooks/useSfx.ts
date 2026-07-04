import { Audio } from 'expo-av';
import { useSettingsStore } from '../store/useSettingsStore';

// In Expo, local assets are imported via require
const SFX_FILES = {
  beep: require('../../assets/sfx/beep.wav'),
  blip: require('../../assets/sfx/blip.wav'),
  levelup: require('../../assets/sfx/levelup.wav'),
};

export type SfxType = keyof typeof SFX_FILES;

export function useSfx() {
  const { soundEffectsEnabled } = useSettingsStore();

  const playSfx = async (type: SfxType) => {
    if (!soundEffectsEnabled) return;

    try {
      const { sound } = await Audio.Sound.createAsync(
        SFX_FILES[type],
        { shouldPlay: true }
      );
      
      // Unload sound from memory once it finishes playing
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch((err: any) => {
            console.warn('Failed to unload sound:', err);
          });
        }
      });
    } catch (error) {
      // Fail silently if sound asset is missing or audio fails to init
      console.log(`Sound effect [${type}] could not be played. (Asset may not be placed yet)`);
    }
  };

  return { playSfx };
}
