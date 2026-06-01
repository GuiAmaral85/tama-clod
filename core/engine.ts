// Motor de estado do TAMA CLOD.
// Regra-chave: o crescimento só conta tokens DEPOIS da instalação
// (ts >= installedAt). Histórico anterior é ignorado — todo mundo nasce ovo.

import { CONFIG, Config } from "./config";
import { UsageEvent } from "./usage";

export interface PetState {
  stage: number;          // 0=ovo .. 4=adulto
  isEgg: boolean;         // stage === 0
  growthTokens: number;   // acumulado pós-instalação (pra estágio)
  energy: number;         // 0..100 — cota da janela que ainda sobra
  hunger: number;         // 0..100 — 100 = faminto
  lastActivityTs: number | null;
  msSinceActivity: number | null;
}

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

function stageFor(growthTokens: number, cfg: Config): number {
  let s = 0;
  for (const t of cfg.stageThresholds) if (growthTokens >= t.minTokens) s = t.stage;
  return s;
}

export function computeState(
  events: UsageEvent[],
  installedAt: number,
  now: number = Date.now(),
  cfg: Config = CONFIG
): PetState {
  // 1) CRESCIMENTO — só conta o que veio depois da instalação.
  let growthTokens = 0;
  let lastActivityTs: number | null = null;
  for (const ev of events) {
    if (ev.ts < installedAt) continue;          // <- ignora histórico
    growthTokens += ev.growth;
    if (lastActivityTs === null || ev.ts > lastActivityTs) lastActivityTs = ev.ts;
  }
  const stage = stageFor(growthTokens, cfg);

  // 2) ENERGIA — consumo total na janela rolante ÷ teto. Mais consumo = menos energia.
  const windowStart = now - cfg.energyWindowMs;
  let windowTokens = 0;
  for (const ev of events) {
    if (ev.ts >= windowStart && ev.ts >= installedAt) windowTokens += ev.total;
  }
  const energy = clamp(100 * (1 - windowTokens / cfg.energyCapTokens));

  // 3) FOME — tempo desde a última atividade pós-instalação.
  let hunger = 0;
  let msSinceActivity: number | null = null;
  if (lastActivityTs !== null) {
    msSinceActivity = now - lastActivityTs;
    hunger = clamp(100 * (msSinceActivity / cfg.hungerFullMs));
  }

  return { stage, isEgg: stage === 0, growthTokens, energy, hunger, lastActivityTs, msSinceActivity };
}
