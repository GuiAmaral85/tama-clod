// Leitor de arquivos do lado Node (roda no servidor, não no navegador).
// Caminha por ~/.claude/projects/**, lê os .jsonl e devolve eventos mesclados.

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import os from "node:os";
import { parseJsonl, mergeEvents, UsageEvent } from "./usage";

export function claudeProjectsDir(): string {
  return join(os.homedir(), ".claude", "projects");
}

async function findJsonl(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out; // pasta ainda não existe — sem problema
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await findJsonl(full)));
    else if (e.isFile() && e.name.endsWith(".jsonl")) out.push(full);
  }
  return out;
}

export async function collectEvents(baseDir = claudeProjectsDir()): Promise<UsageEvent[]> {
  const files = await findJsonl(baseDir);
  const parts: UsageEvent[][] = [];
  for (const f of files) {
    try {
      parts.push(parseJsonl(await readFile(f, "utf8")));
    } catch {
      /* arquivo ilegível no momento (em escrita) — ignora neste tick */
    }
  }
  return mergeEvents(parts);
}
