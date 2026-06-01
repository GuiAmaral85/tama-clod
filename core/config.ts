// TAMA CLOD — tunables. Ajuste estes números depois com dados reais.

export const HOUR = 60 * 60 * 1000;

export const CONFIG = {
  // Janela rolante usada pra "energia" (tokens consumidos recentemente).
  energyWindowMs: 5 * HOUR,

  // Teto de tokens da janela. NÃO é o limite oficial do plano (esse é
  // server-side e não fica nos logs) — é um teto configurável/estimado.
  // Energia = quanto da cota ainda sobra antes de "esgotar".
  energyCapTokens: 1_000_000,

  // Fome chega a 100% depois de ficar este tempo sem nenhuma sessão.
  hungerFullMs: 24 * HOUR,

  // Crescimento (estágio) por tokens ACUMULADOS desde a instalação.
  // Conta input + output + cache_creation; ignora cache_read (é barato e
  // infla a conta sem refletir "esforço").
  //
  // Curva "hardcore": chegar a Adulto leva ~6-8 semanas de uso ativo.
  // Calibrado sobre uso real (~800k de growth por dia ativo). Como o growth
  // inclui cache_creation (que infla rápido no Claude Code), os limiares
  // ficam na casa dos milhões de propósito.
  stageThresholds: [
    { stage: 0, minTokens: 0 },           // OVO — recém-instalado, sem uso
    { stage: 1, minTokens: 100_000 },     // BEBÊ — ~1ª sessão real choca o ovo
    { stage: 2, minTokens: 2_000_000 },   // CRIANÇA — ~2-3 dias ativos
    { stage: 3, minTokens: 10_000_000 },  // ADOLESCENTE — ~2 semanas
    { stage: 4, minTokens: 40_000_000 },  // ADULTO — ~6-8 semanas
  ],
};

export type Config = typeof CONFIG;
