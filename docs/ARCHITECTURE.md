# MELDA — Architecture

## Purpose

MELDA closes a teaching loop — **Prepare → Learn → Observe → Understand → Adapt** — with the least code that makes the loop real end to end. Three layers, one shared dataset:

- **CREATE** — teachers author lessons and reviews (AI-assisted), and adapt sections that aren't landing.
- **EXPERIENCE** — students read lessons, ask for a simpler explanation, and take reviews.
- **UNDERSTAND** — teachers get aggregated, actionable insights, recomputed live from student work.

The hypothesis: _do teachers find MELDA's insights useful enough to change how they teach?_ — now testable against a real student surface rather than a simulated one.

## Design principle

Build the least that makes the loop real. No abstraction unless it is load-bearing. The one abstraction kept from day one is the **AI service boundary** — load-bearing for swapping the mock for real Claude. Two things were deliberately deferred at first and added once the loop demanded them: **persistence** (a student's work has to survive to reach the teacher) and the **student app** itself. Everything still heavier (SQLite, ORM/repositories, auth, a server-side AI proxy) remains **deferred with a named upgrade path**, not built now.

## Stack

| Concern      | Choice                                                                        | Why                                                                                                                                          |
| ------------ | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime      | **Expo SDK 54** + React Native, TypeScript                                    | Cross-platform (iOS / Android / web) from one codebase; Android is the target device (low-resource) but not a limit. Demos via Expo Go (QR). |
| Routing      | **Expo Router** (bundled)                                                     | Platform feature, not an added abstraction. File routes = screens.                                                                           |
| Data         | **In-memory deterministic seed** + **pure aggregation functions**             | A fixed seeded class needs no DB. See "The key simplification".                                                                              |
| Shared state | **One Zustand store** holding the full mutable `Dataset`                      | Both surfaces write to it; insights read from it. One file, no boilerplate context.                                                          |
| Persistence  | Full dataset as **one AsyncStorage JSON blob**, hand-rolled                   | Survives a reload / offline. Hand-rolled because zustand's `persist` uses `import.meta`, which Metro's classic-script output rejects.        |
| AI           | **MockAIService** (default) / **ClaudeAIService** (real), one interface       | Chosen once in `ai/index.ts` by presence of an env key; UI never imports a concrete class.                                                   |
| Charts       | **react-native-gifted-charts** (+ `react-native-svg`, `expo-linear-gradient`) | Expo Go compatible; installed-dep-solves-it.                                                                                                 |
| UI           | **`tokens.ts` + a small component kit** (`components.tsx`)                    | Minimal footprint + pitch polish. No UI-kit dependency.                                                                                      |

**Deferred dependencies (add only when the trigger fires):** `expo-sqlite`, `drizzle-orm`, an auth library.

## The key simplification: in-memory seed, not SQLite

The app renders a **fixed, seeded class** and computes insights from it. The valuable, testable logic is the **aggregation** (counts, %, misconception mapping) — identical whether it runs over a TS array or SQL rows. A seeded dataset in memory needs no schema, no repository layer, no migrations. That deletes an entire layer.

Student writes are real (submissions and signals are appended to the same in-memory dataset and persisted), but they still land in the JSON blob, not a database. **Upgrade path** — move the dataset into `expo-sqlite` and swap the pure selectors for SQL `GROUP BY` when (a) data must scale past a demo class, or (b) multiple devices must share one class. The AI boundary and the pure insight functions are designed so this swap touches only the data source, not the UI.

## Project structure

```
MELDA/
  app/                              # Expo Router routes = screens
    _layout.tsx                     # Root: SafeArea + status bar
    index.tsx                       # Role picker: Teacher / Student
    (teacher)/
      _layout.tsx                   # Bottom tabs: Insights / Lessons / Reviews
      insights/
        index.tsx                   # Class dashboard (aggregated)
        concept/[conceptId].tsx     # Concept drill-down
        student/[studentId].tsx     # Student detail
      lessons/
        index.tsx                   # Lesson library
        new.tsx                     # AI-assisted lesson authoring
        [lessonId]/index.tsx        # Lesson detail
        [lessonId]/adapt.tsx        # Section adaptation
      reviews/
        index.tsx                   # Review library + hand-in status
        new.tsx                     # AI-assisted review authoring
        [assignmentId].tsx          # Live hand-in tracker
    student/
      _layout.tsx
      index.tsx                     # Pick identity + home (lessons + reviews)
      lesson/[lessonId].tsx         # Reader + "I don't get this" (inline adaptation)
      quiz/[assignmentId].tsx       # Take a review (graded on submit)
  src/
    ai/       types.ts  MockAIService.ts  ClaudeAIService.ts  index.ts (ai)  *.check.ts
    data/     seed.ts                                          # deterministic class + signals
    domain/   models.ts  experience.ts  insights/aggregate.ts  *.check.ts   # pure, testable
    state/    store.ts  persist.ts  persist.check.ts           # one store + persistence seam
    ui/       tokens.ts  components.tsx                        # Screen, Card, Button, StatTile, charts
  assets/  docs/  app.json  package.json  tsconfig.json
```

No `db.ts`, no `schema.ts`, no `repositories/` — deferred until the SQLite trigger fires.

## Screens (the loop, end to end)

- **Role picker (`app/index.tsx`):** two surfaces over one brain — choose Teacher or Student. Both write the same store.
- **Teacher — CREATE:** lesson library → AI-assisted authoring → detail → **adapt** a section (simpler / detailed / example / visual / practice / reexplain); review library → AI-assisted review authoring → **live tracker** of hand-ins and scores.
- **Teacher — UNDERSTAND:** class dashboard (aggregated, not a notification stream) → concept drill-down (struggle % + likely misconception) → student detail (mastery per concept).
- **Student — EXPERIENCE:** pick identity → home (published lessons + reviews) → lesson reader with **"I don't get this"** (re-casts the section inline) → take a review, graded on submit.

## AI service abstraction (the one kept abstraction)

All UI depends on this interface; the concrete implementation is chosen once in `src/ai/index.ts`. UI never imports a concrete class.

```ts
interface AIService {
  draftLesson(input: DraftLessonInput): Promise<LessonDraft>; // AI-assisted "new lesson"
  draftQuiz(input: DraftQuizInput): Promise<QuizDraft>; // AI-assisted "new review"
  adaptSection(input: AdaptSectionInput): Promise<AdaptationDraft>; // re-cast for who didn't get it
  narrateInsight(input: NarrateInsightInput): Promise<string>; // numbers in -> sentence out
}
```

- **MockAIService (default):** deterministic, offline output keyed on topic/mode, with a small artificial delay so it feels live. Reproducible demos, no key required.
- **ClaudeAIService (real):** same interface, calls the Anthropic Messages API directly over `fetch` (no SDK dependency). Selected when `EXPO_PUBLIC_ANTHROPIC_API_KEY` is set. **Falls back to the mock on any failure** — no key, no network, or a malformed reply — so the app never breaks mid-demo.
- **Compute vs narrate split:** aggregation is **real** deterministic logic; only the natural-language framing is "AI". `narrateInsight` receives already-computed numbers, so the dashboard's numbers are trustworthy whether the AI is mock or real. MELDA never asks the model for a figure.
- **Client-key caveat:** an `EXPO_PUBLIC_` key is inlined into the client bundle and visible to anyone with the app — fine for a local demo, but production must route these calls through a server that holds the key.

## Data model (TypeScript types over the seed, not SQL tables)

Single source of truth: `src/domain/models.ts`.

**Entities:** `ClassRoom` · `Student` · `Concept`(order) · `Lesson`(sections, status, adaptations) · `LessonSection`(kind, conceptId) · `Adaptation`(mode) · `Question`(conceptId, choices, correctIndex) · `Assignment`(questions, dueAt) · `Submission`(answers) · `Answer`(conceptId, correct) · `LearningSignal`(studentId, type, conceptId?, value?) — all gathered into one `Dataset` container.

**`LearningSignal.type` taxonomy:** `QUESTION_STRUGGLE` · `CONCEPT_REVISIT` · `REQUEST_SIMPLER` · `REQUEST_ALTERNATIVE_EXPLANATION` · `ACTIVITY_PERFORMANCE` · `ASSIGNMENT_PERFORMANCE` · `INCORRECT_PATTERN` · `TIME_ON_SECTION` · `RESOURCE_ENGAGEMENT` · `SUBMISSION_TIMESTAMP`.

**Aggregation (pure functions):**

- `src/domain/insights/aggregate.ts` — class/concept struggle %, most common wrong option → likely misconception, concept difficulty ranking, per-student mastery.
- `src/domain/experience.ts` — grades a student's answers into a `Submission` + the signals it emits, and computes live assignment progress for the tracker. Re-submissions replace the prior attempt (`upsertSubmission`).

## Store and persistence

One Zustand store (`src/state/store.ts`) holds a mutable clone of the seeded `Dataset`. The teacher's CREATE flow grows `lessons`/`assignments`; the student's EXPERIENCE flow appends `submissions`/`signals`. Because UNDERSTAND is pure functions over `data`, the dashboards and tracker recompute live as students act — nothing to sync.

`src/state/persist.ts` is a thin seam: hydrate from AsyncStorage on load, then write the dataset on every change. It's kept separate from the store so a runnable check can exercise it with a fake key-value store. `currentStudentId` is session-only (not persisted) so a reload returns to the role picker. `STORAGE_KEY` carries a version suffix — bump it on any dataset shape change and the store reseeds cleanly. `resetDemo` restores the seed.

## Seed / simulation layer

`src/data/seed.ts` is a **deterministic** class authored once (fixed values / seeded PRNG — no live randomness) so the dashboard always tells the same story: **25 students**, one subject (**Grade 10 Chemistry**) across **7 concepts**, lessons, a seeded review with submissions, and a coherent `LearningSignal` set consistent with each student's ability and each concept's difficulty — producing the headline _"32% struggled with Ionic Bonding"_. It's a plain module import: no DB, no first-run seeding step. Live student submissions then build on top of it.

## Deliberately NOT building yet (YAGNI + upgrade path)

- **SQLite / ORM / repositories** → in-memory seed + AsyncStorage blob; upgrade when data must scale past a demo class or sync across devices.
- **Auth / multi-class / teacher accounts** → single seeded class; add when more than one class or device is real.
- **Server-side AI proxy** → client-side key for the demo; add before any production deployment (see the client-key caveat).

## Verification

- **Run:** `pnpm start`, then open in **Expo Go**: scan the QR from a physical Android or iPhone (works from Windows), or use `a` (emulator) / `w` (web). Prove offline-first by staying keyless (mock AI) and enabling airplane mode after load — in-memory + persisted data, no network.
- **Runnable checks (assert-based, no framework):** `pnpm check` runs five — insight aggregation, the AI mock, the real Claude service (network stubbed, incl. the fallback path), the persistence seam, and the student-loop grading. Plus `pnpm typecheck` (`tsc --noEmit`).
- **Demo narrative (the loop):** role picker → teacher sees _"32% struggled with ionic bonding"_ → drills in and adapts a section → authors a review → switches to a student who reads a lesson and takes the review → back on the teacher side the tracker and dashboards have moved. The loop closes.
