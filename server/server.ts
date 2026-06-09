// TAMA CLOD — servidor local (Node, sem build, roda via tsx).
//
// Responsabilidades:
//   - no boot: garante ~/.tamaclod/state.json com `installedAt` (Date.now()).
//   - lê os logs do Claude Code com core/collect.ts e calcula o estado
//     do bicho com core/engine.ts.
//   - vigia ~/.claude/projects com chokidar e recalcula a cada mudança.
//   - expõe GET /api/state (snapshot), GET /api/stream (SSE) e endpoints
//     opcionais POST /api/reset e POST /api/lang.
//   - serve o frontend de web/dist (produção). Em dev, o Vite serve o front
//     na 5173 e proxia /api pra cá.
//
// Só usa o módulo http nativo — sem Express.

import http from "node:http";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { join, extname, dirname, resolve, normalize } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import os from "node:os";

import chokidar from "chokidar";

import { collectEvents, claudeProjectsDir } from "../core/collect";
import { computeState, PetState } from "../core/engine";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 4321;
const WEB_DIST = resolve(__dirname, "..", "web", "dist");

// ---------- state.json (~/.tamaclod/state.json) ----------

interface AppState {
  installedAt: number;
  lang?: string;
}

function stateDir(): string {
  return join(os.homedir(), ".tamaclod");
}
function stateFile(): string {
  return join(stateDir(), "state.json");
}

// Lê o state.json; se não existir (ou não tiver installedAt), grava agora.
// "Todo usuário começa do ovo na instalação" — installedAt é o marco zero.
async function loadOrInitState(): Promise<AppState> {
  await mkdir(stateDir(), { recursive: true });
  let state: AppState | null = null;
  try {
    state = JSON.parse(await readFile(stateFile(), "utf8"));
  } catch {
    state = null;
  }
  if (!state || typeof state.installedAt !== "number") {
    state = { installedAt: Date.now(), lang: state?.lang };
    await writeFile(stateFile(), JSON.stringify(state, null, 2));
    console.log(`[tamaclod] novo state.json — installedAt = ${new Date(state.installedAt).toISOString()}`);
  }
  return state;
}

async function saveState(state: AppState): Promise<void> {
  await mkdir(stateDir(), { recursive: true });
  await writeFile(stateFile(), JSON.stringify(state, null, 2));
}

// ---------- estado do bicho ----------

let appState: AppState;
let lastPetState: PetState | null = null;

async function recompute(): Promise<PetState> {
  const events = await collectEvents();
  lastPetState = computeState(events, appState.installedAt);
  return lastPetState;
}

// ---------- SSE ----------

const sseClients = new Set<http.ServerResponse>();

function broadcast(state: PetState): void {
  const frame = `data: ${JSON.stringify(state)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(frame);
    } catch {
      sseClients.delete(res);
    }
  }
}

// ---------- estáticos (web/dist em produção) ----------

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
};

async function serveStatic(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  if (!existsSync(WEB_DIST)) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end(
      "Frontend não compilado. Em DEV abra o Vite (http://localhost:5173).\n" +
        "Em produção rode `npm run build` antes de `npm start`.\n"
    );
    return;
  }

  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  // Resolve dentro de WEB_DIST e bloqueia path traversal.
  let filePath = normalize(join(WEB_DIST, urlPath));
  if (!filePath.startsWith(WEB_DIST)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const st = await stat(filePath);
    if (st.isDirectory()) filePath = join(filePath, "index.html");
  } catch {
    // SPA fallback: qualquer rota desconhecida cai no index.html.
    filePath = join(WEB_DIST, "index.html");
  }

  if (!existsSync(filePath)) filePath = join(WEB_DIST, "index.html");

  const type = MIME[extname(filePath).toLowerCase()] || "application/octet-stream";
  res.writeHead(200, { "content-type": type });
  createReadStream(filePath).pipe(res);
}

// ---------- HTTP ----------

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((res) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => res(data));
    req.on("error", () => res(""));
  });
}

const server = http.createServer(async (req, res) => {
  const url = (req.url || "/").split("?")[0];

  // --- API ---
  if (url === "/api/state") {
    const state = lastPetState ?? (await recompute());
    res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    res.end(JSON.stringify(state));
    return;
  }

  if (url === "/api/stream") {
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    });
    res.write("retry: 3000\n\n");
    // manda o snapshot atual imediatamente
    if (lastPetState) res.write(`data: ${JSON.stringify(lastPetState)}\n\n`);
    sseClients.add(res);

    // heartbeat (comentário SSE) pra manter a conexão viva atrás de proxies
    const ping = setInterval(() => {
      try {
        res.write(": ping\n\n");
      } catch {
        /* ignora */
      }
    }, 25_000);

    req.on("close", () => {
      clearInterval(ping);
      sseClients.delete(res);
    });
    return;
  }

  if (url === "/api/reset" && req.method === "POST") {
    appState = { ...appState, installedAt: Date.now() };
    await saveState(appState);
    const state = await recompute();
    broadcast(state);
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true, installedAt: appState.installedAt, state }));
    return;
  }

  if (url === "/api/lang" && req.method === "POST") {
    const body = await readBody(req);
    let lang: string | undefined;
    try {
      lang = JSON.parse(body)?.lang;
    } catch {
      /* corpo inválido */
    }
    if (lang === "pt" || lang === "en") {
      appState = { ...appState, lang };
      await saveState(appState);
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true, lang }));
    } else {
      res.writeHead(400, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: "lang deve ser 'pt' ou 'en'" }));
    }
    return;
  }

  if (url.startsWith("/api/")) {
    res.writeHead(404, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "not found" }));
    return;
  }

  // --- estáticos ---
  await serveStatic(req, res);
});

// ---------- watch + boot ----------

function startWatcher(): void {
  const dir = claudeProjectsDir();
  let timer: NodeJS.Timeout | null = null;

  const trigger = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        const state = await recompute();
        broadcast(state);
      } catch (err) {
        console.error("[tamaclod] erro no recompute:", err);
      }
    }, 300); // debounce
  };

  const watcher = chokidar.watch(dir, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
  });
  watcher.on("add", trigger).on("change", trigger).on("unlink", trigger);
  watcher.on("error", (e) => console.error("[tamaclod] watcher:", e));

  // Fallback: repolling a cada 5s caso o watch não pegue algo.
  setInterval(trigger, 5_000);

  console.log(`[tamaclod] vigiando ${dir}`);
}

export async function start(): Promise<{ url: string }> {
  appState = await loadOrInitState();

  // Sobe o HTTP PRIMEIRO, pra página carregar na hora. O cálculo do estado e o
  // watcher vêm depois — assim nada no boot (leitura de logs, fsevents) atrasa
  // o bind da porta. Loopback IPv4 explícito: mantém tudo na sua máquina e
  // evita o caso em que o navegador (localhost -> 127.0.0.1) não acha um
  // servidor preso só em IPv6.
  await new Promise<void>((ok) => {
    server.listen(PORT, "127.0.0.1", () => {
      console.log(`\n  👾 TAMA CLOD rodando em  http://localhost:${PORT}\n`);
      if (!existsSync(WEB_DIST)) {
        console.log("  (DEV) frontend pelo Vite:  http://localhost:5173");
        console.log("  (PROD) rode `npm run build` para servir o front daqui.\n");
      }
      ok();
    });
  });

  // Primeiro cálculo + broadcast pra quem já estiver ouvindo o SSE.
  try {
    const state = await recompute();
    broadcast(state);
  } catch (err) {
    console.error("[tamaclod] erro no primeiro recompute:", err);
  }

  // Watcher é best-effort: se o fsevents falhar, o repolling de 5s segura.
  try {
    startWatcher();
  } catch (err) {
    console.error("[tamaclod] watcher não iniciou (seguindo só com repolling):", err);
  }

  return { url: `http://localhost:${PORT}` };
}

// Auto-executa quando rodado direto (`npm start` / `node dist/server.mjs`),
// mas NÃO quando importado — o bin do npx importa start() e abre o navegador.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  start().catch((err) => {
    console.error("[tamaclod] falha no boot:", err);
    process.exit(1);
  });
}
