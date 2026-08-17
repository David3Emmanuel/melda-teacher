// The app's single source of truth: a mutable copy of the seeded Dataset.
//
// The teacher's CREATE flow grows `data.lessons` (new lessons, adaptations,
// publishing); the student EXPERIENCE flow appends `data.submissions` and
// `data.signals`. The UNDERSTAND layer is pure functions over `data`, so the
// dashboards recompute live as students act - nothing to sync.
//
// Persisted to AsyncStorage so a demo survives a reload (and works offline).
// We persist by hand rather than via zustand's `persist` middleware: that
// middleware's ESM build uses `import.meta`, which Metro's classic-script
// output rejects on both web and Hermes. `resetDemo` restores the seed.

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dataset } from '../data/seed';
import type { Adaptation, Dataset, Lesson } from '../domain/models';
import { attachPersistence } from './persist';

interface AppState {
  data: Dataset;
  addLesson: (lesson: Lesson) => void;
  addAdaptation: (lessonId: string, adaptation: Adaptation) => void;
  publishLesson: (lessonId: string) => void;
  resetDemo: () => void;
}

// The seed is pure JSON (string timestamps, no Dates/functions), so a
// stringify round-trip is a correct deep clone - and keeps the seed module
// itself immutable no matter what the store mutates.
const cloneSeed = (): Dataset => JSON.parse(JSON.stringify(dataset));

// Bump the version suffix on any Dataset shape change: the old key is then
// ignored and the store reseeds cleanly (acceptable data loss for a demo).
const STORAGE_KEY = 'melda-store-v1';

// Runtime ids only need to be unique within a session; Date.now is fine here
// (unlike the seed, this is not part of the reproducible dataset).
export const newId = (prefix: string): string => `${prefix}-${Date.now()}`;

export const useAppStore = create<AppState>((set) => ({
  data: cloneSeed(),
  addLesson: (lesson) =>
    set((s) => ({ data: { ...s.data, lessons: [lesson, ...s.data.lessons] } })),
  addAdaptation: (lessonId, adaptation) =>
    set((s) => ({
      data: {
        ...s.data,
        lessons: s.data.lessons.map((l) =>
          l.id === lessonId ? { ...l, adaptations: [adaptation, ...l.adaptations] } : l,
        ),
      },
    })),
  publishLesson: (lessonId) =>
    set((s) => ({
      data: {
        ...s.data,
        lessons: s.data.lessons.map((l) => (l.id === lessonId ? { ...l, status: 'published' } : l)),
      },
    })),
  resetDemo: () => set({ data: cloneSeed() }),
}));

// Hydrate from storage, then persist on every change (see persist.ts). A
// corrupt or absent value keeps the seed; the seed is only written once the
// first mutation lands, so a pristine install always reflects the latest seed.
void attachPersistence(useAppStore, AsyncStorage, STORAGE_KEY);
