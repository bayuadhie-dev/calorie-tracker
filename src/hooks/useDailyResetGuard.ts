import { useEffect, useState } from 'react';
import { checkAndPerformDailyReset } from '../engine/dailyReset';
import { useDashboardStore, getTodayLocalDateString } from '../store/useDashboardStore';
import { useProfileStore } from '../store/useProfileStore';

export function useDailyResetGuard() {
  const { loadDailyData, selectedDate, setSelectedDate } = useDashboardStore();
  const { fetchProfile } = useProfileStore();
  const [checking, setChecking] = useState(true);

  const checkDateReset = async () => {
    setChecking(true);
    try {
      const todayStr = getTodayLocalDateString();
      const resetOccurred = await checkAndPerformDailyReset(todayStr);
      
      if (resetOccurred) {
        // Update selected date to today and reload everything
        setSelectedDate(todayStr);
      } else if (selectedDate !== todayStr) {
        // If no reset occurred but user is viewing a different day,
        // let's ensure we are synced to today on app launch
        setSelectedDate(todayStr);
      } else {
        await loadDailyData();
      }
      await fetchProfile();
    } catch (err) {
      console.error('Failed to run daily reset check:', err);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkDateReset();
  }, []);

  return { checking, checkDateReset };
}
