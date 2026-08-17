# MELDA — Architecture (Teacher-First MVP)

## Purpose

Prove MELDA's core hypothesis with the least code: _do teachers find MELDA's insights useful enough to change how they teach?_ This MVP builds the **CREATE** and **UNDERSTAND** layers for teachers; the student **EXPERIENCE** layer is **simulated with seeded data** so the insight dashboards have realistic signals to compute from.

## Design principle

Build the least that validates the hypothesis. No abstraction unless requested or clearly load-bearing. The **one** abstraction kept is the **AI service boundary** — it is load-bearing for swapping the mock for a real Claude implementation later. Everything heavier (SQLite, ORM, repositories, assignment-authoring UI, real AI, student app) is **deferred with a named upgrade path**, not built now.

## Stack

| Concern      | Choice                                                                         | Why                                                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime      | **Expo SDK 57** + React Native, TypeScript                                     | Cross-platform (iOS / Android / web) from one codebase; Android is the target device (low-resource classrooms) but not a limit. Demos via Expo Go (QR). |
| Routing      | **Expo Router** (bundled)                                                      | Platform feature, not an added abstraction.                                                                                                             |
| Data (MVP)   | **In-memory deterministic seed module** + **pure aggregation functions**       | A fixed seeded class needs no DB. See "The key simplification".                                                                                         |
| Persistence  | Only if needed: teacher-created lessons in a single **AsyncStorage** JSON blob | Avoids a DB for a handful of authored items.                                                                                                            |
| Shared state | **One small Zustand store** (created lessons + active class)                   | One file; less boilerplate than hand-rolled context. Nothing global until shared mutable state is real.                                                 |
| Charts       | **react-native-gifted-charts** (+ `react-native-svg`, `expo-linear-gradient`)  | Expo Go compatible; installed-dep-solves-it.                                                                                                            |
| Icons        | **@expo/vector-icons** (bundled)                                               | No setup.                                                                                                                                               |
| UI           | **`tokens.ts` + only the primitives reused** (Screen, Card, Button)            | Minimal footprint + pitch polish. Defer any UI kit.                                                                                                     |

**Deferred dependencies (add only when the trigger fires):** `expo-sqlite`, `drizzle-orm`, React Native Paper.

## The key simplification: in-memory seed, not SQLite

The MVP renders a **fixed, seeded class** and computes insights from it. The valuable, testable logic is the **aggregation** (counts, %, misconception mapping) — identical whether it runs over a TS array or SQL rows. A fixed dataset in memory needs no DB, no schema, no repository layer, no migrations. That deletes an entire layer for zero MVP cost.

**Upgrade path** — move the seed into `expo-sqlite` and swap the pure selectors for SQL `GROUP BY` queries when (a) data must persist/scale past a demo, or (b) real student writes arrive. The AI boundary and the pure insight functions are designed so this swap touches only the data source, not the UI.

## Project structure

```
MELDA/
  app/                          # Expo Router routes = screens
    _layout.tsx                 # Root: theme + store + seed load
    index.tsx                   # Redirect -> (teacher)
    (teacher)/
      _layout.tsx               # Bottom tabs: Lessons / Insights
      lessons/
        index.tsx               # Lesson library
        new.tsx                 # Create/upload lesson (AI-assisted)
        [lessonId]/index.tsx    # Lesson detail
        [lessonId]/adapt.tsx    # Content adaptation
      insights/
        index.tsx               # Class insights dashboard
        concepts/[conceptId].tsx# Concept drill-down
        students/[studentId].tsx# Student detail
  src/
    ai/        types.ts  MockAIService.ts  index.ts (useAI)  fixtures/   # the ONE kept abstraction
    data/      seed.ts                                                    # deterministic class + signals
    domain/    models.ts  insights/aggregate.ts  insights/selectors.ts    # pure, testable
    state/     store.ts                                                    # one Zustand store
    ui/        tokens.ts  components/                                      # Screen, Card, Button, StatTile, chart wrappers
  assets/  docs/  app.config.ts  package.json  tsconfig.json
```

No `db.ts`, no `schema.ts`, no `repositories/`, no `ClaudeAIService.ts` (the stub isn't needed until the swap).

## Screens (core loop only; rest deferred)

Two tabs prove the loop:

- **Lessons (CREATE):** library → create/upload (AI-assisted authoring) → detail → **adapt** (simpler / detailed / example / visual / practice / reexplain). The teacher reviews and edits AI output before publishing.
- **Insights (UNDERSTAND):** class dashboard (aggregated, actionable — not a notification stream) → concept drill-down (common misconception + revisit recommendation) → student detail.

**Deferred screens:** assignment authoring/tracking tab, settings / AI-mode toggle, per-activity editors. Assignment _performance_ still lives in the seed as a signal feeding insights; only its _authoring UI_ is deferred.

## AI service abstraction (the one kept abstraction)

All UI depends on this interface; the concrete implementation is chosen by a `useAI()` factory. UI never imports a concrete class.

```ts
interface AIService {
  generateLessonFromTopic(input: LessonGenInput): Promise<LessonDraft>;
  adaptContent(input: AdaptInput): Promise<AdaptedContent>; // mode: simpler|detailed|example|visual|practice|reexplain
  generateQuestions(input: QuestionGenInput): Promise<Question[]>;
  summarizeSignalsToInsight(input: InsightNarrationInput): Promise<InsightNarrative>; // numbers in -> sentence out
  recommendIntervention(input: RecommendationInput): Promise<Recommendation>;
}
```

- **MockAIService (now):** deterministic canned content from `src/ai/fixtures/`, keyed on topic/mode (seed topics like "Ionic Bonding"), with a small artificial delay so it feels live. Reproducible demos.
- **ClaudeAIService (later):** same interface, wraps the Claude Messages API; prompt templates in `src/ai/prompts/`. Swap via config; zero UI change.
- **Compute vs narrate split:** aggregation is **real** deterministic logic; only the natural-language framing and suggested action are "AI" (mock now). `summarizeSignalsToInsight` receives already-computed numbers — so the dashboard's numbers are trustworthy even with mocked AI.

## Data model (TypeScript types over the seed, not SQL tables)

**Entities:** `Class` · `Student`(abilityProfile, for seeding) · `Concept` · `Lesson`(status) · `ContentBlock`(conceptId, type, variant) · `Question`(conceptId, options, correctAnswer) · `Assignment` · `Submission`(answers, score) · `LearningSignal`(studentId, conceptId?, questionId?, type, payload) · derived `Insight` · derived `Recommendation`.

**`LearningSignal.type` taxonomy:** `QUESTION_STRUGGLE` · `CONCEPT_REVISIT` · `REQUEST_SIMPLER` · `REQUEST_ALTERNATIVE_EXPLANATION` · `ACTIVITY_PERFORMANCE` · `ASSIGNMENT_PERFORMANCE` · `INCORRECT_PATTERN` (wrong option → misconception) · `TIME_ON_SECTION` · `RESOURCE_ENGAGEMENT` · `SUBMISSION_TIMESTAMP`.

**Aggregation (real, pure functions in `src/domain/insights/`):**

- Class/concept: struggle % + most common wrong option → likely misconception + revisit recommendation.
- Concept difficulty ranking across the class.
- Per-student: concept mastery + needs-support flag + submission behaviour.

## Seed / simulation layer

`src/data/seed.ts` is a **deterministic** class authored once (fixed values, or a seeded PRNG — no live randomness) so the dashboard always tells the same compelling story (headline like _"32% struggled with ionic bonding"_): ~30 students across an ability distribution, one subject with 3–5 concepts, 1–2 lessons, an assignment with submissions, and a coherent `LearningSignal` set consistent with each student's ability and each concept's difficulty. It's a plain module import — no DB, no first-run seeding step.

## Deliberately NOT building yet (YAGNI + upgrade path)

- **SQLite / ORM / repositories** → in-memory seed; upgrade when data must persist or real writes arrive.
- **Student-facing app** → simulated via seed; upgrade when validating the student side.
- **Real AI** → mock behind the interface; add `ClaudeAIService` at swap time.
- **Assignment authoring/tracking UI** → seed provides the signals now; add UI when needed.
- **Global state beyond one store, any UI kit** → add only when shared state or repeated component boilerplate actually hurts.

## Build sequence (each phase = a commit)

0. Repo + these docs.
1. Scaffold Expo app (SDK 57, TS, Expo Router); `tokens.ts` + base primitives; tab shell.
2. `src/data/seed.ts` + `src/domain/models.ts`.
3. Pure insight functions **+ one runnable check** (see Verification).
4. AI interface + `MockAIService` + fixtures + `useAI()`.
5. CREATE screens: library, create/upload, detail, adapt.
6. UNDERSTAND screens: class dashboard (charts), concept drill-down, student detail, recommendations.
7. Polish: empty/loading states, offline proof, demo script.

## Verification

- **Run:** `npx expo start`, then open in **Expo Go**: scan the QR from a physical Android or iPhone (works from Windows), or use `--android` (emulator) / `--web`. The iOS _simulator_ needs macOS, but a physical iPhone via Expo Go does not. Prove offline-first by enabling airplane mode after load (mock AI + in-memory data, no network).
- **The one runnable check:** a small **assert-based** self-check on the pure insight aggregation against the seed — the non-trivial logic. No test framework, no fixtures (e.g. `src/domain/insights/insights.check.ts` run via `node`). Plus `tsc --noEmit`.
- **Demo narrative (the loop):** open the seeded class → Insights shows _"32% struggled with ionic bonding"_ → drill into the concept → see the common misconception → open the lesson → adapt to a simpler explanation → the loop closes.
