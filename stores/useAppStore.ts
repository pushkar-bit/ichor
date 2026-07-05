import { create } from 'zustand';
import type { Workout, Post, PostDraft, DietAnalysisResult } from '../types';

// ─── User Slice ──────────────────────────────────────────────────────────────

export interface UserSlice {
  id: string | null;
  name: string | null;
  avatar: string | null;
  clanId: string | null;
  token: string | null;
  streakDays: number;
  integrityPoints: number;
  setUser: (user: Partial<Omit<UserSlice, 'setUser' | 'clearUser'>>) => void;
  clearUser: () => void;
}

// ─── Import Slice ─────────────────────────────────────────────────────────────

export interface ImportSlice {
  pendingWorkouts: Workout[];
  currentDraft: Workout | null;
  draftPost: PostDraft | null;
  setPendingWorkouts: (workouts: Workout[]) => void;
  removePendingWorkout: (workoutId: string) => void;
  clearPendingWorkouts: () => void;
  setCurrentDraft: (workout: Workout | null) => void;
  setDraftPost: (post: PostDraft | null) => void;
  updateDraftPost: (updates: Partial<PostDraft>) => void;
  clearDraft: () => void;
}

// ─── Feed Slice ───────────────────────────────────────────────────────────────

export interface FeedSlice {
  optimisticPosts: Post[];
  hasNewPosts: boolean;
  addOptimisticPost: (post: Post) => void;
  removeOptimisticPost: (postId: string) => void;
  setHasNewPosts: (val: boolean) => void;
  clearOptimisticPosts: () => void;
}

// ─── Combined Store ───────────────────────────────────────────────────────────

type AppStore = UserSlice & ImportSlice & FeedSlice;

export const useAppStore = create<AppStore>((set) => ({
  // ── User Slice defaults ──
  id: null,
  name: null,
  avatar: null,
  clanId: null,
  token: null,
  streakDays: 0,
  integrityPoints: 0,

  setUser: (user) => set((state) => ({ ...state, ...user })),
  clearUser: () =>
    set({
      id: null,
      name: null,
      avatar: null,
      clanId: null,
      token: null,
      streakDays: 0,
      integrityPoints: 0,
    }),

  // ── Import Slice defaults ──
  pendingWorkouts: [],
  currentDraft: null,
  draftPost: null,

  setPendingWorkouts: (workouts) => set({ pendingWorkouts: workouts }),
  removePendingWorkout: (workoutId) =>
    set((state) => ({
      pendingWorkouts: state.pendingWorkouts.filter((w) => w.id !== workoutId),
    })),
  clearPendingWorkouts: () => set({ pendingWorkouts: [] }),
  setCurrentDraft: (workout) => set({ currentDraft: workout }),
  setDraftPost: (post) => set({ draftPost: post }),
  updateDraftPost: (updates) =>
    set((state) => ({
      draftPost: state.draftPost ? { ...state.draftPost, ...updates } : null,
    })),
  clearDraft: () => set({ currentDraft: null, draftPost: null }),

  // ── Feed Slice defaults ──
  optimisticPosts: [],
  hasNewPosts: false,

  addOptimisticPost: (post) =>
    set((state) => ({ optimisticPosts: [post, ...state.optimisticPosts] })),
  removeOptimisticPost: (postId) =>
    set((state) => ({
      optimisticPosts: state.optimisticPosts.filter((p) => p.id !== postId),
    })),
  setHasNewPosts: (val) => set({ hasNewPosts: val }),
  clearOptimisticPosts: () => set({ optimisticPosts: [] }),
}));
