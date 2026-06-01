// Parser dos logs do Claude Code (~/.claude/projects/**/*.jsonl).
// IMPORTANTE: funções puras (texto -> eventos). A LEITURA dos arquivos
// é feita pelo plugin `fs` do Tauri no app; aqui só interpretamos.
//
// O schema do JSONL muda entre versões do Claude Code. Por isso a extração
// é tolerante: tenta vários caminhos de campo e ignora o que não bate.

export interface UsageEvent {
  ts: number;        // epoch ms
  id?: string;       // message id (pra deduplicar)
  growth: number;    // tokens que contam pra crescimento (in+out+cacheCreate)
  total: number;     // tokens totais (inclui cache_read) — usado na energia
}

function num(v: unknown): number {
  return typeof v === "number" && isFinite(v) ? v : 0;
}

// Extrai um evento de uso de uma linha já parseada (objeto). Retorna null
// se a linha não tiver uso de tokens (ex.: mensagens do usuário, eventos meta).
export function extractEvent(obj: any): UsageEvent | null {
  if (!obj || typeof obj !== "object") return null;

  // usage pode estar em obj.message.usage (assistant) ou obj.usage.
  const usage = obj?.message?.usage ?? obj?.usage;
  if (!usage || typeof usage !== "object") return null;

  const input = num(usage.input_tokens);
  const output = num(usage.output_tokens);
  const cacheCreate = num(usage.cache_creation_input_tokens);
  const cacheRead = num(usage.cache_read_input_tokens);
  const growth = input + output + cacheCreate;
  const total = growth + cacheRead;
  if (total === 0) return null;

  // timestamp: ISO string ou epoch.
  const raw = obj.timestamp ?? obj.ts ?? obj?.message?.timestamp;
  let ts: number;
  if (typeof raw === "number") ts = raw < 1e12 ? raw * 1000 : raw;
  else if (typeof raw === "string") ts = Date.parse(raw);
  else ts = NaN;
  if (!isFinite(ts)) return null;

  const id = obj?.message?.id ?? obj?.uuid ?? obj?.id;
  return { ts, id: typeof id === "string" ? id : undefined, growth, total };
}

// Parseia um arquivo .jsonl inteiro (uma linha = um JSON).
export function parseJsonl(text: string): UsageEvent[] {
  const out: UsageEvent[] = [];
  for (const line of text.split("\n")) {
    const s = line.trim();
    if (!s) continue;
    try {
      const ev = extractEvent(JSON.parse(s));
      if (ev) out.push(ev);
    } catch {
      /* linha corrompida/parcial — ignora */
    }
  }
  return out;
}

// Junta eventos de vários arquivos e remove duplicatas por id.
export function mergeEvents(parts: UsageEvent[][]): UsageEvent[] {
  const seen = new Set<string>();
  const out: UsageEvent[] = [];
  for (const part of parts) {
    for (const ev of part) {
      const key = ev.id ?? `${ev.ts}:${ev.total}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(ev);
    }
  }
  return out.sort((a, b) => a.ts - b.ts);
}
