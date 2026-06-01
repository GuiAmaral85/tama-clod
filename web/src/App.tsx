import React, { useEffect, useState } from "react";

/* ===========================================================
   TAMA CLOD — pixel edition (PT / EN)
   Bichinho fiel à mascote do terminal do Claude Code.
   Pixel art real (células). Estado AO VIVO vindo do servidor Node
   (GET /api/state + SSE /api/stream). Toggle "DEMO" com sliders.
   =========================================================== */

const C = {
  bg: "#1d1a24", bgDeep: "#15131b", panel: "#211d29",
  body: "#C76A47", bodyTop: "#A4502F", eye: "#17141c",
  border: "#D9825A", gray: "#8b8597",
  energized: "#E59461", tired: "#9E6347", sick: "#8C8A5A", faint: "#7E7A66",
  amber: "#E8A23D", blue: "#6FA0C8", pink: "#D9657A", red: "#C9534A", cream: "#E9E2CE",
};

type Lang = "pt" | "en";

// Estado que chega do servidor (core/engine.ts -> PetState).
interface PetState {
  stage: number;
  isEgg: boolean;
  growthTokens: number;
  energy: number;
  hunger: number;
  lastActivityTs: number | null;
  msSinceActivity: number | null;
}

interface PetCfg {
  egg?: boolean;
  cracks?: boolean;
  stage?: number;
  body?: string;
  top?: string;
  eye?: string;
  mouth?: string;
  acc?: string[];
  squash?: number;
  tilt?: number;
  glow?: number;
  bob?: boolean;
}

const Px = ({ x, y, w = 1, h = 1, fill, opacity }: { x: number; y: number; w?: number; h?: number; fill?: string; opacity?: number }) => (
  <rect x={x} y={y} width={w} height={h} fill={fill} opacity={opacity} shapeRendering="crispEdges" />
);

function geom(stage: number) {
  return [null, { w: 8, h: 5, legs: 2 }, { w: 10, h: 6, legs: 3 }, { w: 12, h: 6, legs: 3 }, { w: 14, h: 7, legs: 4 }][stage]!;
}

function eyes(type: string, lx: number, rx: number, ey: number, col: string) {
  const E = (cx: number, parts: any[]) => parts.map((p, i) => <Px key={cx + "-" + i} x={cx + p[0]} y={ey + p[1]} w={p[2] || 1} h={p[3] || 1} fill={p[4] || col} />);
  switch (type) {
    case "happy": return [...E(lx, [[-1, 1], [0, 0], [1, 1]]), ...E(rx, [[-1, 1], [0, 0], [1, 1]])];
    case "sleepy":
    case "closed": return [...E(lx, [[-1, 1, 3, 1]]), ...E(rx, [[-1, 1, 3, 1]])];
    case "dead":
    case "dizzy": return [...E(lx, [[-1, 0], [1, 0], [0, 1], [-1, 2], [1, 2]]), ...E(rx, [[-1, 0], [1, 0], [0, 1], [-1, 2], [1, 2]])];
    case "hungry": return [...E(lx, [[-1, 0, 3, 3, "#fff"], [0, 1, 1, 1], [1, 0, 1, 1, "#fff"]]), ...E(rx, [[-1, 0, 3, 3, "#fff"], [0, 1, 1, 1], [1, 0, 1, 1, "#fff"]])];
    case "wide": return [...E(lx, [[-1, 0, 3, 3]]), ...E(rx, [[-1, 0, 3, 3]]), <Px key="sl" x={lx} y={ey} fill="#fff" />, <Px key="sr" x={rx} y={ey} fill="#fff" />];
    case "sick": return [...E(lx, [[-1, -1, 3, 1], [0, 0, 1, 1]]), ...E(rx, [[-1, -1, 3, 1], [0, 0, 1, 1]])];
    default: return [...E(lx, [[0, 0, 1, 2]]), ...E(rx, [[0, 0, 1, 2]])];
  }
}

function mouthPx(type: string, cx: number, my: number, col: string) {
  switch (type) {
    case "open": return [<Px key="m" x={cx - 1} y={my} w={2} h={2} fill={col} />];
    case "drool": return [<Px key="m" x={cx - 1} y={my} w={2} h={1} fill={col} />, <Px key="d" x={cx + 1} y={my} h={2} fill={C.blue} />];
    case "wavy": return [<Px key="m1" x={cx - 2} y={my} fill={col} />, <Px key="m2" x={cx - 1} y={my + 1} fill={col} />, <Px key="m3" x={cx} y={my} fill={col} />, <Px key="m4" x={cx + 1} y={my + 1} fill={col} />];
    default: return [];
  }
}

function accessory(kind: string, b: { l: number; r: number; t: number; bot: number; cx: number }) {
  const { l, r, t, bot, cx } = b;
  const z = (x: number, y: number) => [<Px key={"z" + x + y} x={x} y={y} w={3} h={1} fill={C.gray} />, <Px key={"zd" + x + y} x={x + 1} y={y + 1} fill={C.gray} />, <Px key={"zb" + x + y} x={x} y={y + 2} w={3} h={1} fill={C.gray} />];
  const star = (x: number, y: number, c = C.amber) => [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]].map((p, i) => <Px key={"s" + x + y + i} x={x + p[0]} y={y + p[1]} fill={c} />);
  switch (kind) {
    case "zzz": return <g className="cg-float">{z(r + 1, t - 4)}<g transform="scale(0.7)">{z((r + 5) / 0.7, (t - 7) / 0.7)}</g></g>;
    case "sweat": return <g className="cg-drip">{[[r + 1, t + 1], [r + 1, t + 2], [r, t + 3], [r + 2, t + 3], [r + 1, t + 3]].map(([x, y], i) => <Px key={i} x={x} y={y} fill={C.blue} />)}</g>;
    case "tears": return <g className="cg-drip">{[[l + 2, t + 3, 1, 2], [r - 2, t + 3, 1, 2]].map(([x, y, w, h], i) => <Px key={i} x={x} y={y} w={w} h={h} fill={C.blue} />)}</g>;
    case "thermometer": return <g>{[<Px key="s" x={r} y={t} w={1} h={4} fill="#fff" />, <Px key="b" x={r - 1} y={t + 4} w={3} h={2} fill={C.red} />, <Px key="m" x={r} y={t + 2} w={1} h={2} fill={C.red} />]}</g>;
    case "sparkles": return <g className="cg-twinkle">{[...star(l - 2, t), ...star(r + 3, t + 1), ...star(r + 2, bot - 1), ...star(l - 3, bot - 2)]}</g>;
    case "hearts": return <g className="cg-float">{[[1, 0], [3, 0], [0, 1, 5, 1], [1, 2, 3, 1], [2, 3]].map((p, i) => <Px key={i} x={r + 2 + p[0]} y={t - 3 + p[1]} w={p[2] || 1} h={p[3] || 1} fill={C.pink} />)}</g>;
    case "evolve": return <g className="cg-twinkle">{[[cx, t - 4], [r + 3, t], [r + 4, (t + bot) / 2 | 0], [r + 3, bot], [cx, bot + 3], [l - 3, bot], [l - 4, (t + bot) / 2 | 0], [l - 3, t]].flatMap(([x, y], i) => star(x, y).map((sEl, j) => React.cloneElement(sEl, { key: i + "-" + j })))}</g>;
    case "crumbs": return <g>{[[l + 1, bot + 1], [r - 1, bot + 1], [cx, bot + 2]].map(([x, y], i) => <Px key={i} x={x} y={y} fill={C.bodyTop} />)}</g>;
    default: return null;
  }
}

function PixelPet({ cfg }: { cfg: PetCfg }) {
  const { egg, cracks, stage = 4, body = C.body, top = C.bodyTop, eye = "neutral", mouth = "none", acc = [], squash = 1, tilt = 0, glow = 0, bob = false } = cfg;
  let content: React.ReactNode;
  if (egg) {
    const rows = [[-9, 4], [-8, 6], [-7, 8], [-6, 10], [-5, 10], [-4, 10], [-3, 10], [-2, 10], [-1, 10], [0, 10], [1, 8], [2, 6]];
    content = (
      <g>
        {rows.map(([y, w], i) => <Px key={i} x={-w / 2} y={y} w={w} h={1} fill={i < 2 ? top : body} />)}
        <Px x={-3} y={-3} w={1} h={2} fill={C.eye} opacity={0.45} />
        <Px x={2} y={-3} w={1} h={2} fill={C.eye} opacity={0.45} />
        {cracks && [[-4, -5], [-3, -4], [-3, -3], [-2, -2], [-2, -1], [-1, 0], [0, 0], [0, 1]].map(([x, y], i) => <Px key={"c" + i} x={x} y={y} fill={C.bgDeep} />)}
      </g>
    );
  } else {
    const g = geom(stage);
    const bx = -Math.round(g.w / 2), by = -Math.round(g.h / 2) - 1;
    const r = bx + g.w, lx = bx + 2, rx = bx + g.w - 3, ey = by + 2;
    const legEls = [];
    for (let i = 0; i < g.legs; i++) {
      const span = g.w - 2;
      const lxp = bx + 1 + Math.round((span - 1) * (g.legs === 1 ? 0.5 : i / (g.legs - 1)));
      legEls.push(<Px key={"leg" + i} x={lxp} y={by + g.h} w={1} h={2} fill={body} />);
    }
    content = (
      <g>
        <Px x={bx} y={by} w={g.w} h={g.h} fill={body} />
        <Px x={bx} y={by} w={g.w} h={1} fill={top} />
        <Px x={r - 4} y={by - 1} w={2} h={1} fill={top} />
        <Px x={bx - 1} y={by + Math.round(g.h * 0.45)} w={1} h={1} fill={body} />
        <Px x={r} y={by + Math.round(g.h * 0.45)} w={1} h={1} fill={body} />
        {legEls}
        {eyes(eye, lx, rx, ey, C.eye)}
        {mouthPx(mouth, Math.round((lx + rx) / 2), ey + 3, C.eye)}
        {acc.map((a, i) => <g key={i}>{accessory(a, { l: bx, r, t: by, bot: by + g.h, cx: Math.round((bx + r) / 2) })}</g>)}
      </g>
    );
  }
  return (
    <svg viewBox="-22 -20 44 40" width="100%" height="100%" style={{ imageRendering: "pixelated" }}>
      {glow > 0 && <rect x="-18" y="-16" width="36" height="32" fill={body} opacity={glow * 0.22} style={{ filter: "blur(6px)" }} />}
      <g className={bob ? "cg-bob" : ""} transform={`rotate(${tilt}) scale(1,${squash})`}>{content}</g>
    </svg>
  );
}

/* ===== i18n ===== */
const T: Record<Lang, any> = {
  pt: { demo: "DEMO", live: "AO VIVO", stageLbl: "ESTAGIO", energyLbl: "ENERGIA(tokens)", hungerLbl: "FOME(sem uso)", allStates: "TODOS OS ESTADOS",
    explain: "ESTAGIO sobe com uso acumulado (cresce de vez). ENERGIA = cota da janela de tokens (recarrega). FOME = tempo sem usar. O charme tá na tensao entre eles.",
    stages: ["OVO", "BEBÊ", "CRIANÇA", "ADOLESC.", "ADULTO"],
    waiting: "OVO · aguardando 1º uso", fainted: "DESMAIADO · cuide dele!", connecting: "conectando ao servidor…",
    growth: "TOKENS (crescimento)", idle: "ultima atividade", never: "nunca", now: "agora há pouco",
    healthy: "saudável", starving: "faminto", hungry: "com fome", energized: "energizado!", exhausted: "exausto", tired: "cansado" },
  en: { demo: "DEMO", live: "LIVE", stageLbl: "STAGE", energyLbl: "ENERGY(tokens)", hungerLbl: "HUNGER(idle)", allStates: "ALL STATES",
    explain: "STAGE grows with cumulative use (permanent). ENERGY = your token-window quota (refills). HUNGER = time since last use. The charm is in the tension between them.",
    stages: ["EGG", "BABY", "CHILD", "TEEN", "ADULT"],
    waiting: "EGG · waiting for first use", fainted: "FAINTED · take care of it!", connecting: "connecting to server…",
    growth: "TOKENS (growth)", idle: "last activity", never: "never", now: "just now",
    healthy: "healthy", starving: "starving", hungry: "hungry", energized: "energized!", exhausted: "exhausted", tired: "tired" },
};

const STATES = [
  { id: "egg", cfg: { egg: true, bob: true }, pt: ["Ovo", "uso zero", "Não chocou. Comece a usar o Claude Code pra dar vida."], en: ["Egg", "zero usage", "Hasn't hatched. Start using Claude Code to bring it to life."] },
  { id: "hatch", cfg: { egg: true, cracks: true, acc: ["sparkles"], bob: true }, pt: ["Eclodindo", "1ª sessão", "Rachando — os primeiros tokens aqueceram o ovo."], en: ["Hatching", "first session", "Cracking — the first tokens warmed the egg."] },
  { id: "baby", cfg: { stage: 1, eye: "happy", acc: ["hearts"], bob: true }, pt: ["Bebê feliz", "estágio 1", "Recém-nascido, pequeno e contente."], en: ["Happy baby", "stage 1", "Newborn, tiny and content."] },
  { id: "babyhungry", cfg: { stage: 1, eye: "hungry", mouth: "open", body: C.tired }, pt: ["Bebê com fome", "ocioso", "Faz um tempo sem usar. Pede sessão pra comer."], en: ["Hungry baby", "idle", "A while since you used it. Begging for a session to eat."] },
  { id: "child", cfg: { stage: 2, eye: "neutral", bob: true }, pt: ["Criança", "estágio 2", "Cresceu: mais pernas, mais energia, brincalhão."], en: ["Child", "stage 2", "Grown: more legs, more energy, playful."] },
  { id: "energized", cfg: { stage: 3, eye: "wide", body: C.energized, glow: 1, acc: ["sparkles"], bob: true }, pt: ["Energizado", "cota cheia", "Janela de tokens cheia: brilha e solta faíscas."], en: ["Energized", "full quota", "Token window full: glowing and sparkling."] },
  { id: "teen", cfg: { stage: 3, eye: "neutral", bob: true }, pt: ["Adolescente", "estágio 3", "Quase adulto, postura firme."], en: ["Teen", "stage 3", "Almost grown, standing tall."] },
  { id: "adult", cfg: { stage: 4, eye: "happy", glow: 0.6, acc: ["sparkles"], bob: true }, pt: ["Adulto", "estágio 4 · auge", "Crescido e saudável. Uso consistente e equilibrado."], en: ["Adult", "stage 4 · peak", "Grown and healthy. Consistent, balanced use."] },
  { id: "tired", cfg: { stage: 3, eye: "sleepy", body: C.tired, squash: 0.85 }, pt: ["Cansado", "tokens baixos", "A cota da janela está acabando. Murcha um pouco."], en: ["Tired", "low tokens", "The window quota is running low. Droops a bit."] },
  { id: "exhausted", cfg: { stage: 3, eye: "sleepy", mouth: "drool", body: C.tired, squash: 0.72, tilt: -5, acc: ["sweat"] }, pt: ["Exausto", "cota ~ zerada", "Queimou tokens rápido demais. Suando, sem força."], en: ["Exhausted", "quota ~ empty", "Burned tokens too fast. Sweating, no strength."] },
  { id: "sleep", cfg: { stage: 3, eye: "closed", squash: 0.9, acc: ["zzz"], bob: true }, pt: ["Dormindo", "madrugada", "Sem atividade e tarde. Cochilando pra recarregar."], en: ["Sleeping", "late night", "No activity, late hour. Napping to recharge."] },
  { id: "starving", cfg: { stage: 2, eye: "hungry", mouth: "open", body: C.tired, acc: ["tears"] }, pt: ["Faminto", "dias sem uso", "Abandonado. Olhos marejados, implorando sessão."], en: ["Starving", "days idle", "Abandoned. Teary-eyed, begging for a session."] },
  { id: "sick", cfg: { stage: 2, eye: "sick", mouth: "wavy", body: C.sick, squash: 0.88, acc: ["thermometer"] }, pt: ["Doente", "negligência", "Tempo demais sem cuidado: febril, esverdeado."], en: ["Sick", "neglect", "Too long uncared-for: feverish, greenish."] },
  { id: "overfed", cfg: { stage: 4, eye: "dizzy", mouth: "wavy", body: C.energized, squash: 1.1, acc: ["crumbs"] }, pt: ["Empanturrado", "uso excessivo", "Gastou MUITO token de vez. Tonto — equilíbrio é tudo."], en: ["Overfed", "overuse", "Spent WAY too many tokens at once. Dizzy — balance is everything."] },
  { id: "evolve", cfg: { stage: 4, eye: "wide", body: C.amber, glow: 1, acc: ["evolve"], bob: true }, pt: ["Evoluindo", "subiu de estágio", "Cresceu! Explosão de luz na transição."], en: ["Evolving", "leveled up", "Grew! A burst of light on the transition."] },
  { id: "faint", cfg: { stage: 2, eye: "dead", body: C.sick, squash: 0.55, tilt: 10 }, pt: ["Desmaiado", "crítico", "Negligência total. Não morre — desmaia até você voltar."], en: ["Fainted", "critical", "Total neglect. It doesn't die — it faints until you return."] },
];

function buildLive(stage: number, energy: number, hunger: number, lang: Lang): { cfg: PetCfg; label: string } {
  const L = T[lang];
  if (stage === 0) return { cfg: { egg: true, bob: true }, label: L.waiting };
  const n = L.stages[stage];
  let cfg: PetCfg = { stage, eye: "neutral", body: C.body, glow: energy / 130, acc: [], bob: true, squash: 1, tilt: 0, mouth: "none" };
  let label = `${n} · ${L.healthy}`;
  if (hunger > 75) { cfg.eye = "hungry"; cfg.mouth = "open"; cfg.body = C.tired; cfg.acc = ["tears"]; cfg.bob = false; label = `${n} · ${L.starving}`; }
  else if (hunger > 45) { cfg.eye = "sleepy"; label = `${n} · ${L.hungry}`; }
  else if (hunger < 15) { cfg.eye = "happy"; cfg.acc = ["hearts"]; }
  if (energy > 85 && hunger < 45) { cfg.body = C.energized; cfg.eye = "wide"; cfg.acc = ["sparkles"]; cfg.glow = 1; label = `${n} · ${L.energized}`; }
  else if (energy < 12) { cfg.squash = 0.7; cfg.tilt = -5; cfg.eye = "sleepy"; cfg.mouth = "drool"; cfg.body = C.tired; cfg.glow = 0; cfg.acc = ["sweat"]; cfg.bob = false; label = `${n} · ${L.exhausted}`; }
  else if (energy < 30) { cfg.squash = 0.85; cfg.eye = "sleepy"; cfg.body = C.tired; cfg.glow = 0; cfg.bob = false; label = `${n} · ${L.tired}`; }
  if (energy < 10 && hunger > 80) return { cfg: { stage: Math.max(1, stage - 1), eye: "dead", body: C.sick, squash: 0.55, tilt: 10 }, label: L.fainted };
  return { cfg, label };
}

function fmtIdle(ms: number | null, L: any): string {
  if (ms === null) return L.never;
  const min = Math.floor(ms / 60000);
  if (min < 1) return L.now;
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ${min % 60} min`;
  const d = Math.floor(h / 24);
  return `${d} d ${h % 24} h`;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

function Slider({ label, value, set, max = 100, suffix = "" }: { label: string; value: number; set: (n: number) => void; max?: number; suffix?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: C.border, marginBottom: 8, letterSpacing: 0.5 }}>
        <span>{label}</span><span>{value}{suffix}</span>
      </div>
      <input type="range" min={0} max={max} value={value} onChange={(e) => set(+e.target.value)} className="cg-range" />
    </div>
  );
}

function Screen({ cfg, label, big }: { cfg: PetCfg; label?: string; big?: boolean }) {
  return (
    <div style={{ position: "relative", background: C.bgDeep, border: `2px solid ${C.border}`, borderRadius: 10, height: big ? 250 : 118, overflow: "hidden", boxShadow: "inset 0 0 24px rgba(0,0,0,.6)" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,.025) 0 1px, transparent 1px 3px)", pointerEvents: "none", zIndex: 2 }} />
      <PixelPet cfg={cfg} />
      {big && label && <div style={{ position: "absolute", bottom: 7, left: 0, right: 0, textAlign: "center", fontFamily: "'Press Start 2P', monospace", fontSize: 8.5, color: C.gray }}>{label}</div>}
    </div>
  );
}

// Linha de estatística do painel "AO VIVO".
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12, fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: C.border, letterSpacing: 0.5 }}>
      <span>{label}</span>
      <span style={{ color: C.cream, fontSize: 9 }}>{value}</span>
    </div>
  );
}

export default function App() {
  // Idioma padrão: EN. A escolha do usuário fica salva no localStorage.
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("tamaclod.lang") as Lang) || "en");
  const [demo, setDemo] = useState(false);

  // Estado AO VIVO vindo do servidor Node.
  const [s, setS] = useState<PetState | null>(null);

  // Sliders do modo DEMO.
  const [stage, setStage] = useState(2);
  const [energy, setEnergy] = useState(70);
  const [hunger, setHunger] = useState(20);

  useEffect(() => { localStorage.setItem("tamaclod.lang", lang); }, [lang]);

  useEffect(() => {
    let alive = true;
    fetch("/api/state").then((r) => r.json()).then((d) => { if (alive) setS(d); }).catch(() => {});
    const es = new EventSource("/api/stream");
    es.onmessage = (e) => { try { setS(JSON.parse(e.data)); } catch { /* ignora frame inválido */ } };
    return () => { alive = false; es.close(); };
  }, []);

  const L = T[lang];

  // Quem manda no bicho: sliders (demo) ou estado real (servidor).
  const liveStage = demo ? stage : (s ? s.stage : 0);
  const liveEnergy = demo ? energy : (s ? Math.round(s.energy) : 100);
  const liveHunger = demo ? hunger : (s ? Math.round(s.hunger) : 0);

  const connecting = !demo && s === null;
  const live = connecting
    ? { cfg: { egg: true, bob: true } as PetCfg, label: L.connecting }
    : buildLive(liveStage, liveEnergy, liveHunger, lang);

  const stageName = L.stages[liveStage] ?? L.stages[0];
  const titleShadow = `2px 2px 0 ${C.bodyTop}, 4px 4px 0 ${C.bodyTop}, 6px 6px 0 #6e3a22, 8px 8px 0 #6e3a22`;

  const LangBtn = ({ code }: { code: Lang }) => (
    <button onClick={() => setLang(code)} style={{
      fontFamily: "'Press Start 2P', monospace", fontSize: 11, padding: "9px 12px", cursor: "pointer",
      border: `2px solid ${C.border}`, background: lang === code ? C.border : "transparent",
      color: lang === code ? C.bgDeep : C.border,
    }}>{code.toUpperCase()}</button>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.cream, padding: "30px 16px 70px", fontFamily: "'VT323', monospace" }}>
      <style>{`
        .cg-bob { animation: cgBob 1.1s steps(2) infinite; }
        @keyframes cgBob { 0%,100%{ transform: translateY(0) } 50%{ transform: translateY(-1.4px) } }
        .cg-float { animation: cgFloat 2s steps(3) infinite; }
        @keyframes cgFloat { 0%{opacity:.25; transform:translateY(0)} 50%{opacity:1} 100%{opacity:.25; transform:translateY(-4px)} }
        .cg-twinkle { animation: cgTw .6s steps(2) infinite; }
        @keyframes cgTw { 0%,100%{opacity:.4} 50%{opacity:1} }
        .cg-drip { animation: cgDrip 1.2s steps(2) infinite; }
        @keyframes cgDrip { 0%,100%{transform:translateY(0)} 50%{transform:translateY(1.5px)} }
        .cg-range { -webkit-appearance:none; appearance:none; width:100%; height:10px; background:${C.panel}; border:2px solid ${C.border}; outline:none; }
        .cg-range::-webkit-slider-thumb { -webkit-appearance:none; width:16px; height:16px; background:${C.border}; cursor:pointer; }
        .cg-range::-moz-range-thumb { width:16px; height:16px; border:0; border-radius:0; background:${C.border}; cursor:pointer; }
        .cg-card { transition: transform .08s steps(2); }
        .cg-card:hover { transform: translateY(-3px); }
        .cg-dot { animation: cgPulse 1.4s steps(2) infinite; }
        @keyframes cgPulse { 0%,100%{opacity:.35} 50%{opacity:1} }
      `}</style>

      {/* header */}
      <div style={{ maxWidth: 1080, margin: "0 auto 8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "clamp(22px,5vw,40px)", color: C.body, margin: 0, lineHeight: 1.2, textShadow: titleShadow, letterSpacing: 1 }}>
            TAMA<br />CLOD
          </h1>
          <div style={{ display: "inline-block", marginTop: 18, background: "#000", border: `1px solid ${C.gray}`, borderRadius: 4, padding: "7px 14px", fontSize: 22, color: C.cream }}>
            <span style={{ color: C.border }}>&gt;</span> Life OS: Claude Code Edition
          </div>
        </div>
        <div style={{ display: "flex", gap: 0 }}>
          <LangBtn code="pt" /><LangBtn code="en" />
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: "20px auto 0", display: "flex", flexDirection: "column", gap: 26, alignItems: "center" }}>
        {/* topo: aparelho ao vivo (largura limitada, sempre empilhado) */}
        <div style={{ width: "100%", maxWidth: 440 }}>
          <div style={{ position: "relative", padding: "22px 18px 18px" }}>
            <div style={{ position: "absolute", inset: 0, border: `2px solid ${C.border}`, borderRadius: 12 }} />
            <div style={{ position: "absolute", top: -11, left: 26, background: C.bg, padding: "0 10px", fontFamily: "'Press Start 2P', monospace", fontSize: 11, color: C.border }}>tama·clod</div>
            <div style={{ position: "relative" }}><Screen cfg={live.cfg} label={live.label} big /></div>
            <div style={{ display: "flex", justifyContent: "center", gap: 26, marginTop: 18 }}>
              {["A", "B", "C"].map((b) => (
                <div key={b} style={{ width: 32, height: 32, borderRadius: "50%", background: C.panel, border: `2px solid ${C.border}`, display: "grid", placeItems: "center", fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: C.border }}>{b}</div>
              ))}
            </div>
          </div>

          {/* painel: AO VIVO (estado real) ou DEMO (sliders) */}
          <div style={{ background: C.panel, border: `2px solid ${C.border}`, borderRadius: 10, padding: "18px 16px", marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: C.border }}>
                {!demo && <span className="cg-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: connecting ? C.gray : "#7ec96f", display: "inline-block" }} />}
                <span>{demo ? L.demo : L.live}</span>
              </div>
              <button onClick={() => setDemo((v) => !v)} style={{
                fontFamily: "'Press Start 2P', monospace", fontSize: 8, padding: "7px 10px", cursor: "pointer",
                border: `2px solid ${C.border}`, background: demo ? C.border : "transparent",
                color: demo ? C.bgDeep : C.border,
              }}>{demo ? `${L.live} ▶` : `${L.demo} ▶`}</button>
            </div>

            {demo ? (
              <>
                <Slider label={`${L.stageLbl}:${stageName}`} value={stage} set={setStage} max={4} />
                <Slider label={L.energyLbl} value={energy} set={setEnergy} suffix="%" />
                <Slider label={L.hungerLbl} value={hunger} set={setHunger} suffix="%" />
              </>
            ) : (
              <>
                <Stat label={`${L.stageLbl}:${stageName}`} value={String(liveStage)} />
                <Stat label={L.energyLbl} value={`${liveEnergy}%`} />
                <Stat label={L.hungerLbl} value={`${liveHunger}%`} />
                <Stat label={L.growth} value={s ? fmtTokens(s.growthTokens) : "—"} />
                <Stat label={L.idle} value={s ? fmtIdle(s.msSinceActivity, L) : "—"} />
              </>
            )}
            <p style={{ fontSize: 19, color: C.gray, margin: "10px 0 0", lineHeight: 1.25 }}>{L.explain}</p>
          </div>
        </div>

        {/* abaixo: galeria (largura total) */}
        <div style={{ width: "100%" }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 13, color: C.border, marginBottom: 16 }}>{L.allStates} [{STATES.length}]</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px,1fr))", gap: 12 }}>
            {STATES.map((st) => {
              const [name, tag, desc] = (st as any)[lang];
              return (
                <div key={st.id} className="cg-card" style={{ background: C.panel, border: `2px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
                  <Screen cfg={st.cfg as PetCfg} />
                  <div style={{ padding: "8px 10px 11px" }}>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9.5, color: C.cream, lineHeight: 1.4 }}>{name}</div>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6.5, color: C.border, margin: "5px 0 7px", textTransform: "uppercase" }}>{tag}</div>
                    <div style={{ fontSize: 17, color: C.gray, lineHeight: 1.2 }}>{desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
