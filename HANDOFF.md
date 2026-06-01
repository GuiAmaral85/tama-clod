# TAMA CLOD — Handoff (server local + navegador)

Pixel-art Tamagotchi da mascote do Claude Code. Cresce com o uso do Claude
Code; energia cai quando você queima a cota de tokens; fica faminto se você
some. **Todo usuário começa do ovo na instalação** (uso anterior não conta).

MVP open-source pra rodar local: `npm install`, `npm run dev`, abrir no navegador.

## Arquitetura

Navegador **não** acessa arquivos locais (sandbox). Então um **servidor Node**
faz o trabalho pesado e a página só renderiza:

```
~/.claude/projects/*.jsonl
        │  (Node lê + parseia + calcula)
        ▼
   servidor Node  ──(SSE: estado pronto)──►  página React (renderiza o bicho)
        │
   ~/.tamaclod/state.json   (guarda installedAt + idioma)
```

- **Backend**: Node + TypeScript via `tsx` (sem build no backend).
- **Frontend**: Vite + React + TS (porta direta do protótipo `tama-clod.jsx`).
- **Watch**: `chokidar` na pasta de projetos (fallback: repolling a cada ~5s).
- **Tempo real**: **SSE** (Server-Sent Events) — servidor→cliente, sem libs de socket.
- Dependências mínimas: `chokidar` (+ `tsx`, `vite`, `react` no front).

## Estrutura de pastas sugerida

```
tama-clod/
├─ core/                 # lógica pura (já pronta e testada)
│  ├─ config.ts          # tunables (limiares, teto de energia, fome)
│  ├─ usage.ts           # parser tolerante do JSONL (texto → eventos)
│  ├─ engine.ts          # computeState(events, installedAt, now)
│  └─ collect.ts         # Node: lê ~/.claude/projects/** → eventos
├─ server/
│  └─ server.ts          # A CONSTRUIR: SSE + estáticos + watch + state.json
├─ web/                  # app Vite/React (base: tama-clod.tsx)
│  └─ src/App.tsx
├─ package.json
├─ HANDOFF.md
└─ README.md
```

## O que JÁ está pronto (neste pacote)

`core/config.ts`, `core/usage.ts`, `core/engine.ts`, `core/collect.ts` — testados.
`computeState` devolve `{ stage, isEgg, growthTokens, energy, hunger, ... }`.

## O que CONSTRUIR

### 1. `server/server.ts` (Node)
- No boot: ler `~/.tamaclod/state.json`; se não houver `installedAt`, gravar `Date.now()`.
- `recompute()`: `await collectEvents()` → `computeState(events, installedAt)` → guarda o último estado.
- `chokidar.watch(claudeProjectsDir())` com debounce (~300ms) chama `recompute()` e faz broadcast.
- Servir os estáticos do `web/dist` (produção) ou proxiar o Vite (dev).
- Endpoints:
  - `GET /api/state` → JSON do estado atual (snapshot inicial).
  - `GET /api/stream` → **SSE**: manda o estado a cada mudança (`data: {json}\n\n`).
  - `POST /api/reset` (opcional) → reescreve `installedAt = now` ("novo bicho").
- Pode usar só o módulo `http` nativo; não precisa de Express.

### 2. Frontend (`web/src/App.tsx`, baseado no `tama-clod.tsx`)
- Trocar os 3 sliders por estado vindo do servidor:
  ```ts
  const [s, setS] = useState(null);
  useEffect(() => {
    fetch("/api/state").then(r => r.json()).then(setS);
    const es = new EventSource("/api/stream");
    es.onmessage = (e) => setS(JSON.parse(e.data));
    return () => es.close();
  }, []);
  ```
- Mapear `{stage, energy, hunger}` → visual com a função `buildLive` que já existe.
- Manter a galeria de estados. Sugestão: manter os sliders atrás de um toggle "Demo".
- Idioma PT/EN continua igual; persistir a escolha no `state.json` via um pequeno
  `POST /api/lang` (ou só no localStorage do front — mais simples pro MVP).
- Embutir as fontes `Press Start 2P` e `VT323` localmente (sem Google Fonts).

### 3. `package.json` (scripts sugeridos)
```jsonc
{
  "type": "module",
  "scripts": {
    "dev": "concurrently \"vite --root web\" \"tsx watch server/server.ts\"",
    "build": "vite build --root web",
    "start": "tsx server/server.ts"   // serve web/dist + SSE
  },
  "dependencies": { "chokidar": "^3" },
  "devDependencies": { "tsx": "^4", "concurrently": "^9", "vite": "^5", "typescript": "^5" }
}
```

## Regras (no `core/engine.ts`)
- **Estágio** = soma de `input+output+cache_creation` de eventos com `ts >= installedAt`.
  Monotônico (nunca regride). `cache_read` ignorado no crescimento.
- **Energia** = `100 * (1 − tokensNaJanela5h / energyCapTokens)`. Recarrega sozinho.
- **Fome** = `100 * (tempoDesdeÚltimaAtividade / hungerFullMs)`.

## Caveats honestos
- O **limite real do plano é server-side**, não está nos logs. `energyCapTokens` é
  um teto configurável/estimado — exponha como ajuste do usuário.
- **Schema do JSONL varia** entre versões; `usage.ts` é tolerante, mas valide com
  seus arquivos reais.
- **Performance**: reler tudo a cada mudança é ok no MVP; depois, leitura
  incremental (guardar tamanho/última posição por arquivo).
- Multiplataforma: `os.homedir()` resolve o `~` no Win/Mac/Linux.
