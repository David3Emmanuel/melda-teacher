# MELDA — Architecture (teacher app)

## Purpose

MELDA closes a teaching loop — **Prepare → Learn → Observe → Understand → Adapt** — across three layers:

- **CREATE** — teachers author lessons and reviews (AI-assisted), and adapt sections that aren't landing.
- **EXPERIENCE** — students read lessons, ask for a simpler explanation, and take reviews.
- **UNDERSTAND** — teachers get aggregated, actionable insights, recomputed from real student work.

This repo is the **teacher app** (CREATE + UNDERSTAND). The student surface and the data + AI they share live in sibling repos.

## The split: why this app owns no data

MELDA began as one Expo app where the teacher and student surfaces shared a single in-process store — the loop worked only because both mutated the same in-memory `Dataset`. Once the two surfaces became separate apps (separate processes, separate devices), that shared memory was gone, so the shared state moved to a backend:

- **[melda-backend](https://github.com/David3Emmanuel/melda-backend)** owns the class `Dataset` in Postgres, runs the deterministic aggregation, and proxies the Anthropic calls — **the key lives there, nowhere else**.
- **[melda-shared](https://github.com/David3Emmanuel/melda-shared)** holds the pure domain types, the aggregation/experience logic, and the REST DTOs — one source of truth the backend runs and both apps type against.
- **melda-teacher / melda-student** are thin clients: fetch a server-computed model, render it; POST an action, refetch.

The one load-bearing consequence: this app **never computes an insight and never holds a secret**. Every trust boundary — grading, the answer key, the AI key, tenancy — is server-side.

## Stack (client)

| Concern       | Choice                                                                | Why                                                                                               |
| ------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Runtime       | **Expo SDK 54** + React Native, TypeScript                            | One codebase (iOS / Android / web); Android is the target. Demos via Expo Go (QR).                |
| Routing       | **Expo Router**                                                       | File routes = screens; a platform feature, not an added abstraction.                              |
| Server access | **`src/api/client.ts`** — a `fetch` wrapper                           | One door: attaches the JWT, throws `ApiError` on non-2xx, fires the 401 handler.                  |
| Data fetching | **`src/api/useApi.ts`**                                               | Small hook; each screen declares what it reads.                                                   |
| State         | **One Zustand store, session-only** (`token`, `user`, `currentClass`) | The store used to hold the whole `Dataset`; now it just proves who you are and which class.       |
| Persistence   | **JWT (+ user/class) as one AsyncStorage blob**                       | A reload keeps you signed in; a bumped storage key boots signed-out (the token is re-obtainable). |
| Charts        | **react-native-gifted-charts** (+ `react-native-svg`)                 | Expo Go compatible.                                                                               |
| UI            | **`tokens.ts` + a small component kit**                               | Minimal footprint, no UI-kit dependency.                                                          |

Types are consumed from `melda-shared` as a **type-only import** (`import type`), so babel erases them and Metro never bundles the package.

## Data flow

A screen calls `api.something()` → the backend reassembles the `Dataset` for that class (`loadDataset`) and runs the **same pure function** the app used to call in-process (`classSummary`, `conceptDetail`, `assignmentProgress`, …) → returns JSON. The number on screen was computed by code that `melda-shared`'s checks pin — not by this app, and not by the model.

Writes (create lesson / adaptation / assignment, publish, submit) POST to the backend and the screen refetches. Ids are server-generated; the client mints nothing that reaches the backend.

## Auth

Login posts `{ email, password, role: 'teacher' }` → `{ token, user }`. `signIn` stores the JWT, loads the teacher's classes, and picks the first. The client attaches `Authorization: Bearer <jwt>` to every request; a **401 anywhere signs the user out once, everywhere**. The old "pick a role / pick a name" screens are gone — the JWT subject is the identity.

## AI (the one kept abstraction)

The four AI methods live behind one interface in the backend:

```ts
interface AIService {
  draftLesson(input: DraftLessonInput): Promise<LessonDraft>;
  draftQuiz(input: DraftQuizInput): Promise<QuizDraft>;
  adaptSection(input: AdaptSectionInput): Promise<AdaptationDraft>;
  narrateInsight(input: NarrateInsightInput): Promise<string>; // numbers in -> sentence out
}
```

This app calls the first three through `/ai/*` (teacher-only). `narrateInsight` is **not** a public route — it runs inside the insights read, after aggregation, so numbers and their narration return together and the model never sees a figure it could change. Mock by default, real Claude when the backend has a key, mock fallback on any failure. The old **client-key caveat is retired: there is no client key.**

## Project structure

```
app/                                # Expo Router routes = screens
  _layout.tsx                       # Root: session hydrate + splash gate
  index.tsx                         # Teacher login (was the role picker)
  (teacher)/
    _layout.tsx                     # Bottom tabs: Insights / Lessons / Reviews
    insights/index.tsx              # Class dashboard (server-computed)
    insights/concept/[conceptId].tsx
    insights/student/[studentId].tsx
    lessons/index.tsx  new.tsx  [lessonId]/index.tsx  [lessonId]/adapt.tsx
    reviews/index.tsx  new.tsx  [assignmentId].tsx     # authoring + live tracker
src/
  api/    client.ts  useApi.ts  client.check.ts        # the one door to the backend
  state/  store.ts                                     # session-only Zustand store
  ui/     tokens.ts  components.tsx                     # design tokens + component kit
```

No `domain/`, `data/seed.ts`, `ai/`, or `state/persist.ts` here anymore — the model, the seed, the AI implementations, and data persistence all moved server-side.

## What lives elsewhere

- **Data model, aggregation, experience logic, REST DTOs** → `melda-shared`.
- **DB schema, `loadDataset`, auth, endpoints, AI implementations, seed** → `melda-backend`.
- **Student screens** → `melda-student`.

## Ceilings / upgrade paths

- `melda-shared` is a **git dependency pinned to a tag** — a shared change needs a tag bump there and a ref bump in the consumers.
- The JWT is persisted via **AsyncStorage**; `expo-secure-store` is the upgrade for at-rest token protection.
- **One class per session** (`currentClass` = the first). A class picker is the upgrade when a teacher has several.

## Verification

- `pnpm typecheck` (`tsc --noEmit`) + `pnpm check` (the API client contract).
- **End-to-end:** backend up → sign in here (see the headline) → the student app submits a review → refetch here, the numbers moved. The loop closes across processes, not in shared memory.
