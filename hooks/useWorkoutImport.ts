import { Platform } from 'react-native';
import { useAppStore } from '../stores/useAppStore';
import api from '../services/api';
import { Workout } from '../types';

export const useWorkoutImport = () => {
  const setPendingWorkouts = useAppStore((state) => state.setPendingWorkouts);
  const pendingWorkouts = useAppStore((state) => state.pendingWorkouts);

  const importWorkouts = async () => {
    let recentWorkouts: Partial<Workout>[] = [];

    if (Platform.OS === 'web') {
      // Simulate/mock some workouts on Web to allow testing and avoid crashes!
      recentWorkouts = [
        {
          externalId: 'web_mock_1',
          activityType: 'RUN',
          distanceKm: 5.2,
          durationSeconds: 1500,
          avgPaceMinPerKm: 4.8,
          caloriesBurned: 420,
          heartRateAvg: 155,
          workoutDate: new Date().toISOString(),
        },
        {
          externalId: 'web_mock_2',
          activityType: 'CYCLE',
          distanceKm: 15.5,
          durationSeconds: 2700,
          avgPaceMinPerKm: 2.9,
          caloriesBurned: 600,
          heartRateAvg: 140,
          workoutDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
      ];
    } else {
      // Mobile implementation would call iOS HealthKit or Android Health Connect
      // Placeholder since we only run Web locally.
    }

    try {
      // POST to backend for dedup checking
      const response = await api.post('/api/workouts/sync', recentWorkouts);
      
      // If we synced successfully, update Zustand with new pending items
      // (For mock web we just show them as pending if they are new)
      if (response.data) {
        setPendingWorkouts(recentWorkouts as any[]);
      }
    } catch (error) {
      console.error('Error importing workouts:', error);
    }
  };

  return {
    importWorkouts,
    pendingWorkouts,
  };
};
