# MELDA — Teacher app

AI teaching assistant for the **AFRETEC Innovation Challenge** — the teacher surface of MELDA, built for **low-resource classrooms** (low-end Android, unreliable power, patchy connectivity). Teachers prepare learning, understand how students respond, and adapt.

## The loop

MELDA closes a feedback loop — **Prepare → Learn → Observe → Understand → Adapt** — across three layers, now running as three separate apps:

- **CREATE** (this app) — AI-assisted lesson authoring with inline adaptation, and review authoring with a live hand-in tracker.
- **EXPERIENCE** ([melda-student](https://github.com/David3Emmanuel/melda-student)) — students read lessons, ask for a simpler explanation, take reviews.
- **UNDERSTAND** (this app) — a class dashboard of aggregated, actionable insights, recomputed from real student work.

The differentiator is the loop, not any single feature: what the teacher teaches → how students interact → what they struggle with → what the teacher does next.

## Architecture in one paragraph

This app is a **thin client**. It holds no data and never sees the Anthropic key: every screen reads a **server-computed** model through [src/api/client.ts](src/api/client.ts) and writes back through it. The backend owns the shared class dataset, runs the deterministic aggregation, and proxies AI drafting. So MELDA **never asks the model for a number** — every figure ("32% struggled with Ionic Bonding") is computed server-side; the AI only drafts and narrates the prose around it. Full picture in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Stack

**Expo (SDK 54) + React Native + TypeScript** — iOS / Android / web from one codebase; Android is the target device. State is **session-only**: a JWT in a small Zustand store, persisted to AsyncStorage so a reload keeps you signed in. Shared entity + DTO **types** come from [melda-shared](https://github.com/David3Emmanuel/melda-shared) as a type-only import (erased at build, never bundled). Charts via `react-native-gifted-charts`.

## Running

This app needs the backend. Start [melda-backend](https://github.com/David3Emmanuel/melda-backend) first (it runs with zero setup), then:

```bash
pnpm install
pnpm start
```

Open in **Expo Go** — scan the QR from a physical Android or iPhone (works from Windows), or press `a` (Android emulator) / `w` (web). Point the app at your backend with `EXPO_PUBLIC_API_URL` (defaults to `http://localhost:4000`); a physical device needs the host LAN IP (e.g. `http://192.168.1.10:4000`). Copy [.env.example](.env.example) to `.env` to set it.

The login screen is prefilled with the seeded demo teacher — **`teacher@melda.africa` / `melda`** — so a reviewer signs in with one tap.

Runnable checks (assert-based, no framework):

```bash
pnpm check      # API client contract
pnpm typecheck
```

## Demo flow

1. Sign in as the demo teacher. The class dashboard headline reads **"…% struggled with Ionic Bonding"** — computed server-side from raw submissions, never stored. Drill into a concept to see who's below the pass line, then into a student for per-concept mastery.
2. **Adapt:** open the lesson that teaches it and re-cast a section ("Simpler", "Worked example", …). MELDA drafts it through the backend AI proxy and grafts the adaptation inline.
3. **Create a review:** Reviews → **New** → type a topic. MELDA drafts a multiple-choice paper; set it for the class and land on the **live tracker** (0 handed in).
4. In the **student app**, a student takes the review and submits — graded server-side.
5. Back here, the tracker and dashboard move on the next refresh. **The loop closed** — across processes, over the network, not a shared in-memory store.

**Reset demo** re-seeds the class (dev only).

## Project layout

- `app/` — Expo Router routes: `index.tsx` (teacher login), `(teacher)/` tabs (Insights / Lessons / Reviews)
- `src/api/` — `client.ts` (the one door to the backend) + `useApi.ts` (fetch hook)
- `src/state/` — `store.ts`, the session-only Zustand store (JWT + current class)
- `src/ui/` — design tokens + the shared component kit

## The four repos

- **[melda-teacher](https://github.com/David3Emmanuel/melda-teacher)** — this app (teacher CREATE + UNDERSTAND)
- **[melda-student](https://github.com/David3Emmanuel/melda-student)** — student app (EXPERIENCE)
- **[melda-backend](https://github.com/David3Emmanuel/melda-backend)** — Express + Postgres/PGlite + Drizzle + JWT; owns the data, proxies AI
- **[melda-shared](https://github.com/David3Emmanuel/melda-shared)** — pure domain types, aggregation logic, and REST DTOs
