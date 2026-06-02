import api from './api';
import { FinalRunStats } from '../stores/useAppStore';

export interface SaveRunResponse {
  runId: string;
  success: boolean;
}

/**
 * Saves a completed run to the backend.
 * The Clerk JWT is automatically attached via the Axios request interceptor.
 */
export async function saveRun(stats: FinalRunStats): Promise<SaveRunResponse> {
  const response = await api.post<SaveRunResponse>('/api/runs', {
    gpxPath: stats.gpxPath,
    distanceKm: stats.distanceKm,
    durationSeconds: stats.durationSeconds,
    avgPaceMinPerKm: stats.avgPaceMinPerKm,
    calories: stats.calories,
    isPublic: true,
  });
  return response.data;
}
