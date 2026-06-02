# 👾 TAMA CLOD

A pixel-art Tamagotchi that lives off your **Claude Code** usage. The more you
code with Claude Code, the more the little creature grows. But be careful: burn
through your whole token-window quota and it gets weak — disappear for days and
it goes hungry. The balance is the game.

> Everyone starts from the **egg**: usage before installation doesn't count.
> You raise your own TAMA CLOD from scratch.

## How it works

A local Node server reads Claude Code's session logs
(`~/.claude/projects/*.jsonl`), computes the creature's state, and serves a
page. You open it in the browser and watch it live. Nothing leaves your machine.

- **Stage** (grows permanently): tokens accumulated since you installed.
- **Energy** (recharges): how much of your 5-hour window quota is left.
- **Hunger**: time since your last session.

## Requirements

- **Node 18+** (you probably already have it — it ships with Claude Code)
- Claude Code installed and used at least once

## Run it (one command)

```bash
npx tama-clod
```

Starts a local server and **opens your browser automatically**. Keep the tab
open while you use Claude Code and watch the creature react. That's it — no
clone, nothing installed permanently.

> Default port is 4321; change it with `PORT=8080 npx tama-clod` if needed.

## Run from source (dev / contributing)

```bash
git clone https://github.com/GuiAmaral85/tama-clod.git
cd tama-clod
npm install

# development (hot reload)
npm run dev          # open http://localhost:5173

# or production (build and serve everything from Node)
npm run build
npm start            # open http://localhost:4321
```

## macOS menu bar app prototype

This repo also includes a local macOS SwiftUI prototype in
`macos/TamaClodMenuBar`. It is a **menu-bar-only** companion: launching it adds
a small TAMA CLOD status item to the macOS menu bar, starts the same local Node
server used by the browser version, reads `/api/state` + `/api/stream`, and
shows the pet in a native popover.

The app is intentionally a local prototype for now. It does not install a login
item, does not ship a signed release build, and does not send data anywhere.
On macOS versions that support Liquid Glass, the popover uses native glass
surfaces and glass button styles. Earlier macOS versions fall back to adaptive
system materials.

### macOS requirements

- macOS 13+
- Node 18+
- Swift toolchain / Xcode command line tools
- Claude Code installed and used at least once
- Repo dependencies installed with `npm install` or `npm ci`

### Build and open the app

```bash
git clone https://github.com/GuiAmaral85/tama-clod.git
cd tama-clod
npm install

npm run mac:app
```

`npm run mac:app` builds the SwiftPM project, stages a local app bundle at
`macos/TamaClodMenuBar/dist/TamaClodMenuBar.app`, and opens it.

Because this is a menu-bar-only app, it does **not** appear in the Dock. Look
for the TAMA CLOD status item in the menu bar and click it to open the popover.

### Using the menu bar app

- Click the menu bar item to open or close the popover.
- The popover shows the live pet, current label, stage, energy, hunger, growth
  tokens, and idle time.
- Use **Refresh** to request a fresh `/api/state` snapshot.
- Use **Quit** to close the app and stop its Node helper process.
- The app starts `npm run mac:server` automatically on launch.
- The helper server binds to `127.0.0.1:4321` by default and is stopped when the
  app quits.

You can verify the server while the app is running:

```bash
curl http://127.0.0.1:4321/api/state
```

### Notifications

The macOS app watches the same state changes as the web UI and turns relevant
milestones into notifications:

- stage evolution
- low energy
- critical energy
- energy recovery
- high hunger
- critical hunger
- fainted state

The default notification mode is **Animated popover**. In this mode, the app
opens/highlights the native popover when a milestone happens. You can switch to
**macOS notifications** from the popover; if system notification permission is
denied or unavailable, the app falls back to the animated popover.

### macOS development commands

```bash
npm run mac:server   # run only the local Node server used by the app
npm run mac:test     # run Swift tests for the macOS core
npm run mac:app      # build and open the local menu bar app bundle
```

The Swift package has two targets:

- `TamaClodCore`: shared/testable logic for server state, SSE parsing, visual
  mapping, milestone detection, formatting, repo-root resolution, and Node
  helper lifecycle.
- `TamaClodMenuBar`: AppKit + SwiftUI app target with `NSStatusItem`,
  `NSPopover`, native pixel-art rendering, Liquid Glass popover surfaces,
  settings, and notification delivery.

### Troubleshooting

- **No Dock icon:** expected. The prototype is menu-bar-only.
- **No menu bar item:** run `npm run mac:app` again and check for build errors.
- **Popover says disconnected:** confirm the server responds with
  `curl http://127.0.0.1:4321/api/state`.
- **Port conflict:** stop any previous `tama-clod` server or process using port
  `4321`.
- **macOS notifications do not appear:** enable notifications for the staged app
  in System Settings, or use the default animated popover mode.

## Configuration

The growth numbers, the energy cap, and the hunger timer live in
`core/config.ts`. Start with the defaults and tune them to your pace:

```ts
energyCapTokens: 1_000_000,   // window cap (NOT your plan's official limit)
hungerFullMs: 24 * HOUR,      // starving after 1 idle day
stageThresholds: [ ... ]      // accumulated tokens per stage
```

> ⚠️ Your plan's real limit is enforced server-side by Anthropic and isn't in
> the logs. "Energy" is an estimate against a cap that you configure.

## Languages

A **PT / EN** toggle in the top corner — Portuguese (BR) and English (US).
Defaults to English.

## Status

MVP. Runs locally, open source. Contributions welcome.

## License

[MIT](LICENSE) © Guilherme Amaral.
