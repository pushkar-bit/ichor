import { create } from 'zustand';
import { GpxPoint } from '../utils/paceCalculator';

export interface FinalRunStats {
  gpxPath: GpxPoint[];
  distanceKm: number;
  durationSeconds: number;
  avgPaceMinPerKm: number;
  calories: number;
}

export interface UserSlice {
  id: string | null;
  name: string | null;
  avatar: string | null;
  clanId: string | null;
  token: string | null;
  setUser: (user: Partial<UserSlice>) => void;
  clearUser: () => void;
}

export interface ActiveRunSlice {
  isRunning: boolean;
  isPaused: boolean;
  startTime: number | null;
  coordinates: GpxPoint[];
  distance: number;
  pace: number;
  duration: number;
  calories: number;
  splitMarkers: number[];
  startRun: () => void;
  pauseRun: () => void;
  resumeRun: () => void;
  stopRun: () => void;
  addCoordinate: (point: GpxPoint) => void;
  updateRunStats: (distance: number, pace: number, duration: number, calories: number) => void;
  addSplitMarker: (km: number) => void;
  resetRun: () => void;
}

type AppStore = UserSlice & ActiveRunSlice;

export const useAppStore = create<AppStore>((set) => ({
  // User Slice
  id: null,
  name: null,
  avatar: null,
  clanId: null,
  token: null,
  setUser: (user) => set((state) => ({ ...state, ...user })),
  clearUser: () => set({ id: null, name: null, avatar: null, clanId: null, token: null }),

  // Active Run Slice
  isRunning: false,
  isPaused: false,
  startTime: null,
  coordinates: [],
  distance: 0,
  pace: 0,
  duration: 0,
  calories: 0,
  splitMarkers: [],
  
  startRun: () => set({ 
    isRunning: true, 
    isPaused: false, 
    startTime: Date.now(),
    coordinates: [],
    distance: 0,
    pace: 0,
    duration: 0,
    calories: 0,
    splitMarkers: [],
  }),
  pauseRun: () => set({ isPaused: true }),
  resumeRun: () => set({ isPaused: false }),
  stopRun: () => set({ isRunning: false, isPaused: false }),
  addCoordinate: (point) => set((state) => ({ coordinates: [...state.coordinates, point] })),
  updateRunStats: (distance, pace, duration, calories) => set({ distance, pace, duration, calories }),
  addSplitMarker: (km) => set((state) => ({ splitMarkers: [...state.splitMarkers, km] })),
  resetRun: () => set({ 
    isRunning: false, 
    isPaused: false, 
    startTime: null,
    coordinates: [],
    distance: 0,
    pace: 0,
    duration: 0,
    calories: 0,
    splitMarkers: [],
  }),
}));
