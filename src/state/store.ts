// The only mutable state in the app: the teacher's lessons, seeded from the
// dataset and then grown by the CREATE flow (new lessons, adaptations,
// publishing a draft). Insights are NOT kept here - they are pure functions
// over the static seed, so there is nothing to sync.

import { create } from 'zustand';
import { dataset } from '../data/seed';
import type { Adaptation, Lesson } from '../domain/models';

interface AppState {
  lessons: Lesson[];
  addLesson: (lesson: Lesson) => void;
  addAdaptation: (lessonId: string, adaptation: Adaptation) => void;
  publishLesson: (lessonId: string) => void;
}

// Runtime ids only need to be unique within a session; Date.now is fine here
// (unlike the seed, this is not part of the reproducible dataset).
export const newId = (prefix: string): string => `${prefix}-${Date.now()}`;

export const useAppStore = create<AppState>((set) => ({
  lessons: dataset.lessons.map((l) => ({ ...l })),
  addLesson: (lesson) => set((s) => ({ lessons: [lesson, ...s.lessons] })),
  addAdaptation: (lessonId, adaptation) =>
    set((s) => ({
      lessons: s.lessons.map((l) =>
        l.id === lessonId ? { ...l, adaptations: [adaptation, ...l.adaptations] } : l,
      ),
    })),
  publishLesson: (lessonId) =>
    set((s) => ({
      lessons: s.lessons.map((l) => (l.id === lessonId ? { ...l, status: 'published' } : l)),
    })),
}));
