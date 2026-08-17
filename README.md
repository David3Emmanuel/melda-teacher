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

**Expo (SDK 57) + React Native + TypeScript.** Cross-platform (iOS / Android / web) from one codebase; Android is the target device. In-memory seeded data + pure insight functions (no database yet — see the upgrade path in the architecture doc).

## Status

**Design stage — no app code yet.** The architecture and build order live in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Running (once scaffolded)

```bash
npx expo start
```

Then open in **Expo Go** — scan the QR from a physical Android or iPhone (works from Windows), or use `--android` (emulator) / `--web`. Works fully offline after first load (mocked AI + in-memory data).
