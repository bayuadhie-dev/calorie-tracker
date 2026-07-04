import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const KEY_ALIAS = 'calorie_tracker_db_key';

export async function getOrCreateEncryptionKey(): Promise<string> {
  try {
    let key = await SecureStore.getItemAsync(KEY_ALIAS);
    if (!key) {
      // Generate a cryptographically secure 256-bit key represented as a hex string
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      key = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      
      await SecureStore.setItemAsync(KEY_ALIAS, key);
    }
    return key;
  } catch (error) {
    console.error('Failed to get or create DB encryption key:', error);
    // Return a fallback key for development if SecureStore fails
    return 'fallback_dev_secure_key_calorie_tracker';
  }
}
