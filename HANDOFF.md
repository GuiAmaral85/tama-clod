# TAMA CLOD — Architecture & developer notes

Pixel-art Tamagotchi of the Claude Code mascot. It grows with Claude Code
usage; energy drops as you burn your token-window quota; it gets hungry when
you go idle. **Every user starts from the egg at install time** (prior usage
doesn't count).

Open-source MVP that runs locally. End users just run `npx tama-clod`;
contributors clone and run `npm run dev`.

## Architecture

The browser **can't** read local files (sandbox), so a **Node server** does the
heavy lifting and the page only renders:

```
~/.claude/projects/*.jsonl
        │  (Node reads + parses + computes)
        ▼
   Node server  ──(SSE: ready state)──►  React page (renders the creature)
        │
   ~/.tamaclod/state.json   (stores installedAt + language)
```

- **Backend**: Node + TypeScript. In dev it runs via `tsx`; for distribution
  it's bundled to plain ESM with esbuild (`dist/server.mjs`).
- **Frontend**: Vite + React + TS. The fonts (Press Start 2P, VT323) are
  embedded locally — no Google Fonts.
- **Watch**: `chokidar` on the projects folder (fallback: re-poll every ~5s).
- **Real-time**: **SSE** (Server-Sent Events) — server→client, no socket libs.
- **Runtime dependency**: just `chokidar` (React/Vite/tsx/esbuild are dev-only).

## Folder structure

```
tama-clod/
├─ core/                 # pure logic
│  ├─ config.ts          # tunables (thresholds, energy cap, hunger)
│  ├─ usage.ts           # tolerant JSONL parser (text → events)
│  ├─ engine.ts          # computeState(events, installedAt, now)
│  └─ collect.ts         # Node: reads ~/.claude/projects/** → events
├─ server/
│  └─ server.ts          # SSE + static files + watch + state.json
├─ web/                  # Vite/React app
│  └─ src/App.tsx
├─ bin/
│  └─ tama-clod.mjs      # `npx tama-clod` entry: starts the server, opens browser
├─ package.json
├─ HANDOFF.md
└─ README.md
```

## HTTP endpoints (`server/server.ts`)

- `GET /api/state` → current state as JSON (initial snapshot).
- `GET /api/stream` → **SSE**: pushes the state on every change (`data: {json}\n\n`).
- `POST /api/reset` → rewrites `installedAt = now` ("new creature").
- `POST /api/lang` → persists the language choice in `state.json`.
- Anything else → static files from `web/dist` (production).

Uses only Node's native `http` module — no Express. Binds to `127.0.0.1` (IPv4
loopback) to keep everything on your machine and avoid the `localhost`
IPv6/IPv4 mismatch.

## Frontend (`web/src/App.tsx`)

- State comes from the server (initial `fetch /api/state` + live `EventSource
  /api/stream`); `{ stage, energy, hunger }` maps to the visuals through the
  `buildLive` function.
- The state gallery is always visible; manual sliders live behind a "Demo"
  toggle.
- PT/EN toggle, default EN, persisted in `localStorage`.

## Rules (`core/engine.ts`)

- **Stage** = sum of `input + output + cache_creation` for events with
  `ts >= installedAt`. Monotonic (never regresses). `cache_read` is ignored for
  growth.
- **Energy** = `100 * (1 − tokensInWindow5h / energyCapTokens)`. Recharges on
  its own.
- **Hunger** = `100 * (timeSinceLastActivity / hungerFullMs)`.

## Honest caveats

- The **plan's real limit is server-side** and isn't in the logs.
  `energyCapTokens` is a configurable/estimated cap — exposed as a user tunable.
- **The JSONL schema varies** across Claude Code versions; `usage.ts` is
  tolerant, but validate against your real files.
- **Performance**: re-reading everything on each change is fine for the MVP;
  later, do incremental reads (track size/last offset per file).
- Cross-platform: `os.homedir()` resolves `~` on Windows/macOS/Linux.
