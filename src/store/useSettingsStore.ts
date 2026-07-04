import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface SettingsStore {
  soundEffectsEnabled: boolean;
  loadSettings: () => Promise<void>;
  toggleSoundEffects: () => Promise<void>;
}

const SOUND_SETTINGS_KEY = 'settings_sfx_enabled';

export const useSettingsStore = create<SettingsStore>((set) => ({
  soundEffectsEnabled: true,

  loadSettings: async () => {
    try {
      const stored = await SecureStore.getItemAsync(SOUND_SETTINGS_KEY);
      if (stored !== null) {
        set({ soundEffectsEnabled: stored === 'true' });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  },

  toggleSoundEffects: async () => {
    set((state) => {
      const newVal = !state.soundEffectsEnabled;
      SecureStore.setItemAsync(SOUND_SETTINGS_KEY, String(newVal)).catch((err) =>
        console.error('Failed to save settings:', err)
      );
      return { soundEffectsEnabled: newVal };
    });
  },
}));
