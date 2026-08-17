# MELDA

AI teaching assistant + student learning companion for the **AFRETEC Innovation Challenge**. MELDA helps teachers prepare better learning experiences, understand how students respond to them, and use that information to teach more effectively — built for **low-resource classrooms** (low-end Android, unreliable power, patchy connectivity).

## The idea

A closed feedback loop — **Prepare → Learn → Observe → Understand → Adapt** — across three layers:

- **CREATE** — help teachers prepare learning (lessons, adaptation, questions, activities).
- **EXPERIENCE** — help students learn (interactive lessons, private questions, practice).
- **UNDERSTAND** — help teachers understand learning (aggregated, actionable insights).

The differentiator isn't any single feature — those exist already. It's the **loop**: connecting what the teacher teaches, how students interact, what they struggle with, and what the teacher does next.

## This MVP (teacher-first)

- **Scope:** build **CREATE + UNDERSTAND** for teachers. Student **EXPERIENCE** is **simulated with seeded data** so the insight dashboards are populated — no student-facing app yet.
- **AI:** **mocked** (offline, deterministic) behind a swappable interface, so a real Claude implementation drops in later without touching UI.
- **Goal:** validate the core hypothesis — _do teachers find MELDA's insights useful enough to change how they teach?_

## Stack

**Expo (SDK 56) + React Native + TypeScript.** Cross-platform (iOS / Android / web) from one codebase; Android is the target device. In-memory seeded data + pure insight functions (no database yet — see the upgrade path in the architecture doc).

## Status

**Built.** The teacher-first MVP runs: an AI-assisted lesson library (CREATE) and a class-insights dashboard driven by seeded student data (UNDERSTAND), joined by the adapt loop. The mocked AI sits behind [src/ai/index.ts](src/ai/index.ts) - swap that one line for a real Claude client. Architecture and the real-backend upgrade path live in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Running

```bash
pnpm install
pnpm start
```

Then open in **Expo Go** - scan the QR from a physical Android or iPhone (works from Windows), or press `a` (Android emulator) / `w` (web). Works fully offline after first load (mocked AI + in-memory data).

Two runnable checks pin the logic, no test framework:

```bash
pnpm check      # insight aggregation + AI mock
pnpm typecheck
```

## Demo flow

**Understand then Adapt (the loop):**

1. The app opens on the **class dashboard**. The headline reads **"32% struggled with Ionic Bonding"** - recomputed from raw submissions by the aggregation layer, never stored.
2. Tap the headline to drill into **Ionic Bonding**: the 8 students below the pass line, the signals MELDA captured, and a jump into the lesson that teaches it.
3. Tap a student to see their mastery across every concept.
4. Open the lesson and **Adapt** a section - pick "Simpler", "Worked example" and so on, and MELDA re-casts it for the students who did not get it. The adaptation is grafted inline under the original section.

**Create:** Lessons tab, **New**, type a topic. MELDA drafts a full lesson (explanation, example, activity, check); save it to the library as a draft, then publish.

## Project layout

- `app/` - screens and navigation (Expo Router file routes)
- `src/domain/` - data model, deterministic seed, insight aggregation
- `src/ai/` - the swappable AI interface plus the deterministic mock
- `src/ui/` - design tokens and the shared component kit
- `src/state/` - the teacher's mutable lessons (Zustand)
