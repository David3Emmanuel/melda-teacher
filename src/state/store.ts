// Session state only. The dashboards no longer live here - the backend owns the
// shared Dataset and computes every read model, so a screen fetches what it needs
// through `api.*` and this store holds just enough to prove who you are and which
// class you are looking at.
//
// The JWT is persisted (AsyncStorage) so a reload keeps you signed in; on boot
// `hydrate` reads it back and hands it to the API client. A 401 anywhere signs
// you out once, everywhere (registered below as the client's unauthorized handler).

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthResponse, AuthUser, ClassCard } from 'melda-shared';
import { api, setAuthToken, setUnauthorizedHandler } from '../api/client';

interface SessionState {
  token: string | null;
  user: AuthUser | null;
  currentClass: ClassCard | null;
  // Every class this teacher can view (a teacher can own more than one). Kept so
  // the dashboard can offer a switcher; `signIn` already fetches this list.
  classes: ClassCard[];
  // False until the first hydrate resolves, so the root layout can hold the UI
  // behind a splash rather than flash the login screen over a valid session.
  hydrated: boolean;
  hydrate: () => Promise<void>;
  // Establishes a session: authorizes the client, loads the teacher's classes,
  // picks the first, and persists. Returns the chosen class (null if none), so
  // the login screen can tell "no classes yet" from "wrong password".
  signIn: (auth: AuthResponse) => Promise<ClassCard | null>;
  signOut: () => void;
  setCurrentClass: (klass: ClassCard) => void;
}

// Bump the suffix on any stored-shape change: the old value is then ignored and
// the app boots signed-out (acceptable - the token is re-obtainable by login).
const STORAGE_KEY = 'melda-session-v2';

const persist = (s: Pick<SessionState, 'token' | 'user' | 'currentClass' | 'classes'>) =>
  AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      token: s.token,
      user: s.user,
      currentClass: s.currentClass,
      classes: s.classes,
    }),
  );

export const useSession = create<SessionState>((set, get) => ({
  token: null,
  user: null,
  currentClass: null,
  classes: [],
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Pick<
          SessionState,
          'token' | 'user' | 'currentClass' | 'classes'
        >;
        if (saved.token) {
          setAuthToken(saved.token);
          set({
            token: saved.token,
            user: saved.user,
            currentClass: saved.currentClass,
            classes: saved.classes ?? [],
            hydrated: true,
          });
          return;
        }
      }
    } catch {
      // Corrupt or absent value: fall through to a clean signed-out boot.
    }
    set({ hydrated: true });
  },

  signIn: async (auth) => {
    setAuthToken(auth.token);
    const classes = await api.myClasses();
    const currentClass = classes[0] ?? null;
    set({ token: auth.token, user: auth.user, currentClass, classes });
    await persist({ token: auth.token, user: auth.user, currentClass, classes });
    return currentClass;
  },

  signOut: () => {
    setAuthToken(null);
    set({ token: null, user: null, currentClass: null, classes: [] });
    void AsyncStorage.removeItem(STORAGE_KEY);
  },

  setCurrentClass: (currentClass) => {
    const { token, user, classes } = get();
    set({ currentClass });
    if (token) void persist({ token, user, currentClass, classes });
  },
}));

// An expired or rejected token anywhere in the app signs the user out once.
setUnauthorizedHandler(() => useSession.getState().signOut());
