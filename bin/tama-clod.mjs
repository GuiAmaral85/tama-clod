#!/usr/bin/env node
// Entrada do `npx tama-clod`: sobe o servidor local (servindo o front já
// compilado em web/dist) e abre o navegador. Sem build, sem tsx na máquina
// de quem usa — o servidor já vem compilado em dist/server.mjs.

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

function openBrowser(url) {
  let cmd, args;
  if (process.platform === "darwin") {
    cmd = "open";
    args = [url];
  } else if (process.platform === "win32") {
    cmd = "cmd";
    args = ["/c", "start", "", url];
  } else {
    cmd = "xdg-open";
    args = [url];
  }
  try {
    const child = spawn(cmd, args, { stdio: "ignore", detached: true });
    child.on("error", () => {}); // sem navegador? sem problema
    child.unref();
  } catch {
    /* segue sem abrir; o usuário acessa a URL na mão */
  }
}

const { start } = await import(join(here, "..", "dist", "server.mjs"));
const { url } = await start();
console.log(`\n  Abrindo ${url} no navegador… (se não abrir, acesse manualmente)\n`);
openBrowser(url);
