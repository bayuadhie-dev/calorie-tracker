import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Set notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const notificationService = {
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  },

  async scheduleReminders(): Promise<void> {
    if (Platform.OS === 'web') return;

    // 1. Cancel existing notifications first to prevent duplicates
    await this.cancelAllReminders();

    // Request permissions first
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.log('Notification permission not granted.');
      return;
    }

    // 2. Schedule Weigh-in reminder (08:00)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '👾 TIME FOR WEIGH-IN!',
        body: 'SUDAHKAH KAMU MENIMBANG BADAN HARI INI? CATAT DI CALORIE TRACKER!',
      },
      trigger: {
        hour: 8,
        minute: 0,
        repeats: true,
      } as any,
    });

    // 3. Schedule Lunch reminder (12:30)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🍱 SUDAH MAKAN SIANG?',
        body: 'JANGAN LUPA CATAT LUNCH KAMU HARI INI AGAR TETAP ON TRACK!',
      },
      trigger: {
        hour: 12,
        minute: 30,
        repeats: true,
      } as any,
    });

    // 4. Schedule Water reminder (16:00)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💧 HIDRASI WAKTU!',
        body: 'SUDAH MINUM AIR SECUKUPNYA? CEK TARGET HIDRASI KAMU SEKARANG!',
      },
      trigger: {
        hour: 16,
        minute: 0,
        repeats: true,
      } as any,
    });

    console.log('All local reminders scheduled successfully!');
  },

  async cancelAllReminders(): Promise<void> {
    if (Platform.OS === 'web') return;
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('All scheduled reminders cancelled.');
  }
};
