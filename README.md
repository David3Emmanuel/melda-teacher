# MELDA

AI teaching assistant + student learning companion for the **AFRETEC Innovation Challenge**. MELDA helps teachers prepare better learning experiences, understand how students respond to them, and use that information to teach more effectively — built for **low-resource classrooms** (low-end Android, unreliable power, patchy connectivity).

## The idea

A closed feedback loop — **Prepare → Learn → Observe → Understand → Adapt** — across three layers:

- **CREATE** — help teachers prepare learning (lessons, adaptation, reviews).
- **EXPERIENCE** — help students learn (read lessons, ask for a simpler explanation, take reviews).
- **UNDERSTAND** — help teachers understand learning (aggregated, actionable insights).

The differentiator isn't any single feature — those exist already. It's the **loop**: connecting what the teacher teaches, how students interact, what they struggle with, and what the teacher does next.

## What's built

All three layers, joined into one working loop over a shared dataset:

- **Teacher (CREATE + UNDERSTAND):** a class-insights dashboard, AI-assisted lesson authoring with inline adaptation, and AI-assisted review authoring with a live hand-in tracker.
- **Student (EXPERIENCE):** pick your name, read published lessons, ask MELDA to re-explain a section, and take a review — every answer is graded and written back.
- **The loop is live, not simulated:** both surfaces write to the same store, so a student's submission moves the teacher's dashboards and tracker on the next render. Nothing to sync.
- **AI is swappable:** a deterministic **mock** ships by default (offline, reproducible), and a **real Claude** implementation drops in behind the same interface with one env var — see [Real vs mock AI](#real-vs-mock-ai).

MELDA **never asks the model for numbers.** Every figure ("32% struggled") is computed by the deterministic aggregation layer; the AI only drafts and narrates the prose around those numbers.

## Stack

**Expo (SDK 54) + React Native + TypeScript.** Cross-platform (iOS / Android / web) from one codebase; Android is the target device. The full dataset lives in a single Zustand store persisted to AsyncStorage — no database yet (see the upgrade path in the architecture doc). Insights are pure functions over that dataset.

## Status

**Built.** The full loop runs: teacher insights and authoring, a student app that reads lessons and takes reviews, and dashboards + a live tracker that move as students act. The AI seam sits behind [src/ai/index.ts](src/ai/index.ts) — set one env var to go from mock to real Claude, no UI change. Architecture and the real-backend upgrade path live in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Running

```bash
pnpm install
pnpm start
```

Then open in **Expo Go** — scan the QR from a physical Android or iPhone (works from Windows), or press `a` (Android emulator) / `w` (web). With no API key it works **fully offline** after first load (mock AI + persisted in-memory data).

Five runnable checks pin the logic, no test framework:

```bash
pnpm check      # insights + AI mock + Claude service + persistence + student loop
pnpm typecheck
```

## Real vs mock AI

The choice happens once, in [src/ai/index.ts](src/ai/index.ts): if `EXPO_PUBLIC_ANTHROPIC_API_KEY` is set, the app uses the real Claude-backed service; otherwise it uses the deterministic mock. To go live, copy [.env.example](.env.example) to `.env` (git-ignored) and fill in your key:

```bash
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...
EXPO_PUBLIC_ANTHROPIC_MODEL=claude-sonnet-5   # optional
```

The real service calls the Anthropic Messages API directly and **falls back to the mock on any failure** (no key, no network, malformed reply), so a demo never breaks in front of a class.

> **Note:** `EXPO_PUBLIC_` values are inlined into the client bundle and are visible to anyone with the app. That is fine for a local demo only. A real deployment must proxy these calls through a server that holds the key.

## Demo flow

**The full loop — Understand → Create → Experience → Understand:**

1. The app opens on a **role picker**. Tap **Teacher**.
2. The **class dashboard** headline reads **"32% struggled with Ionic Bonding"** — recomputed from raw submissions by the aggregation layer, never stored. Drill into the concept to see the students below the pass line, then into a student to see their mastery across every concept.
3. **Adapt:** open the lesson that teaches it and re-cast a section ("Simpler", "Worked example", …). MELDA grafts the adaptation inline under the original.
4. **Create a review:** Reviews tab → **New** → type a topic. MELDA drafts a multiple-choice review; set it for the class and land on the **live tracker** (0 handed in).
5. **Switch to the student:** back to the role picker → **Student** → pick a name. Read a lesson, tap **"I don't get this"** to have MELDA re-cast the section in simpler terms, then take the new review and submit — it's graded instantly.
6. **Back to the teacher:** the Reviews list and live tracker now show that student's paper, and the class dashboard reflects the new signals. The loop closed.

Everything persists across a reload; **Reset demo** restores the seed.

## Project layout

- `app/` — screens and navigation (Expo Router file routes): `index.tsx` role picker, `(teacher)/` tabs (Insights / Lessons / Reviews), `student/` (home / lesson reader / quiz)
- `src/domain/` — data model, deterministic seed, insight aggregation, the student-loop grading
- `src/ai/` — the swappable AI interface, the deterministic mock, and the real Claude service
- `src/state/` — the full mutable dataset (Zustand) + AsyncStorage persistence
- `src/ui/` — design tokens and the shared component kit
