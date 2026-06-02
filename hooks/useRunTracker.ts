import { useEffect, useRef, useCallback, useState } from 'react';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useAppStore, FinalRunStats } from '../stores/useAppStore';
import { haversineKm } from '../utils/haversine';
import { GpxPoint, instantPace, averagePace, estimateCalories } from '../utils/paceCalculator';

// ─── Types ────────────────────────────────────────────────────────────────────

export type GpsAccuracy = 'Excellent' | 'Good' | 'Poor' | 'Searching';

export interface UseRunTrackerReturn {
  permissionStatus: 'granted' | 'denied' | 'undetermined';
  gpsAccuracy: GpsAccuracy;
  requestPermissions: () => Promise<void>;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<FinalRunStats>;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function derivedAccuracy(accuracyMeters: number | null | undefined): GpsAccuracy {
  if (accuracyMeters == null) 
    return 'Searching';
  if (accuracyMeters <= 5) 
    return 'Excellent';
  if (accuracyMeters <= 15) 
    return 'Good';
  return 'Poor';
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRunTracker(
  onSplitKm?: (km: number, pace: string) => void,
): UseRunTrackerReturn {
  const { startRun, pauseRun, resumeRun, stopRun, addCoordinate, updateRunStats, addSplitMarker } =
    useAppStore();

  // useState properly imported at the top — no require() inside hook body
  const [permStatus, setPermStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [gpsAccuracy, setGpsAccuracy] = useState<GpsAccuracy>('Searching');

  // Refs for high-frequency values (avoids re-render on every GPS tick)
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accumulatedDistanceRef = useRef(0);
  const elapsedSecondsRef = useRef(0);
  const lastCoordRef = useRef<GpxPoint | null>(null);

  // ── Permission request ─────────────────────────────────────────────────────
  const requestPermissions = useCallback(async () => {
    const { status: fg } = await Location.requestForegroundPermissionsAsync();
    if (fg !== 'granted') {
      setPermStatus('denied');
      return;
    }
    // Background permission is best-effort; foreground alone is sufficient for tracking
    await Location.requestBackgroundPermissionsAsync();
    setPermStatus('granted');
  }, []);

  // ── GPS subscription ───────────────────────────────────────────────────────
  const subscribeToLocation = useCallback(async () => {
    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000,
        distanceInterval: 5,
      },
      (location) => {
        const { latitude, longitude, speed, accuracy } = location.coords;
        const timestamp = location.timestamp;

        setGpsAccuracy(derivedAccuracy(accuracy));

        const point: GpxPoint = {
          latitude,
          longitude,
          timestamp,
          speed: speed ?? 0,
        };

        // Haversine incremental distance
        if (lastCoordRef.current) {
          accumulatedDistanceRef.current += haversineKm(lastCoordRef.current, point);
        }
        lastCoordRef.current = point;

        // Push to Zustand store for polyline rendering
        addCoordinate(point);

        // Use getState() to read latest snapshot without closure staleness
        const allCoords = useAppStore.getState().coordinates;
        const currentPace = instantPace(allCoords);
        const currentCalories = estimateCalories(accumulatedDistanceRef.current);

        updateRunStats(
          accumulatedDistanceRef.current,
          currentPace,
          elapsedSecondsRef.current,
          currentCalories,
        );

        // ── Split km notification ─────────────────────────────────────────────
        const crossedKm = Math.floor(accumulatedDistanceRef.current);
        const lastSplitKm = useAppStore.getState().splitMarkers.slice(-1)[0] ?? 0;

        if (crossedKm > 0 && crossedKm > lastSplitKm) {
          addSplitMarker(crossedKm);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          if (onSplitKm) {
            const mins = Math.floor(currentPace);
            const secs = Math.round((currentPace % 1) * 60).toString().padStart(2, '0');
            onSplitKm(crossedKm, `${mins}:${secs} /km`);
          }
        }
      },
    );
  }, [addCoordinate, updateRunStats, addSplitMarker, onSplitKm]);

  const unsubscribeFromLocation = useCallback(() => {
    locationSubscription.current?.remove();
    locationSubscription.current = null;
  }, []);

  // ── Elapsed timer ──────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      elapsedSecondsRef.current += 1;
      const s = useAppStore.getState();
      updateRunStats(accumulatedDistanceRef.current, s.pace, elapsedSecondsRef.current, s.calories);
    }, 1000);
  }, [updateRunStats]);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      unsubscribeFromLocation();
      stopTimer();
    };
  }, [unsubscribeFromLocation, stopTimer]);

  // ── Public API ─────────────────────────────────────────────────────────────
  const start = useCallback(() => {
    accumulatedDistanceRef.current = 0;
    elapsedSecondsRef.current = 0;
    lastCoordRef.current = null;
    startRun();
    subscribeToLocation();
    startTimer();
  }, [startRun, subscribeToLocation, startTimer]);

  const pause = useCallback(() => {
    pauseRun();
    unsubscribeFromLocation();
    stopTimer();
  }, [pauseRun, unsubscribeFromLocation, stopTimer]);

  const resume = useCallback(() => {
    resumeRun();
    subscribeToLocation();
    startTimer();
  }, [resumeRun, subscribeToLocation, startTimer]);

  const stop = useCallback(async (): Promise<FinalRunStats> => {
    unsubscribeFromLocation();
    stopTimer();
    stopRun();

    const finalDistance = accumulatedDistanceRef.current;
    const finalDuration = elapsedSecondsRef.current;

    return {
      gpxPath: useAppStore.getState().coordinates,
      distanceKm: finalDistance,
      durationSeconds: finalDuration,
      avgPaceMinPerKm: averagePace(finalDistance, finalDuration),
      calories: estimateCalories(finalDistance),
    };
  }, [unsubscribeFromLocation, stopTimer, stopRun]);

  return { permissionStatus: permStatus, gpsAccuracy, requestPermissions, start, pause, resume, stop };
}
