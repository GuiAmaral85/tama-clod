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
