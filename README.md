# 🥚 TAMA CLOD

Um Tamagotchi de pixel art que vive do seu uso do **Claude Code**. Quanto mais
você programa com o Claude Code, mais o bichinho cresce. Mas cuidado: se você
queimar toda a cota de tokens da janela, ele fica fraco — e se você sumir por
dias, ele passa fome. O equilíbrio é o jogo.

> Todo mundo começa do **ovo**: o uso anterior à instalação não conta. Você
> cria o seu TAMA CLOD do zero.

## Como funciona

Um servidor local em Node lê os logs de sessão do Claude Code
(`~/.claude/projects/*.jsonl`), calcula o estado do bicho e serve uma página.
Você abre no navegador e acompanha ao vivo. Nada sai da sua máquina.

- **Estágio** (cresce de vez): tokens acumulados desde que você instalou.
- **Energia** (recarrega): quanto da cota da janela de 5h ainda sobra.
- **Fome**: tempo desde a sua última sessão.

## Requisitos

- **Node 18+** (você provavelmente já tem, vem com o Claude Code)
- Claude Code instalado e já usado pelo menos uma vez

## Instalação

```bash
git clone https://github.com/GuiAmaral85/tama-clod.git
cd tama-clod
npm install
```

## Rodando

```bash
# desenvolvimento (hot reload)
npm run dev

# ou produção
npm run build
npm start
```

Abra **http://localhost:4321** no navegador (a porta aparece no terminal).
Deixe a aba aberta enquanto usa o Claude Code e veja o bicho reagir.

## Configuração

Os números de crescimento, o teto de energia e o tempo de fome ficam em
`core/config.ts`. Comece com os padrões e ajuste ao seu ritmo de uso:

```ts
energyCapTokens: 1_000_000,   // teto da janela (NÃO é o limite oficial do plano)
hungerFullMs: 24 * HOUR,      // faminto após 1 dia parado
stageThresholds: [ ... ]      // tokens acumulados por estágio
```

> ⚠️ O limite real do seu plano é definido no servidor da Anthropic e não fica
> nos logs. A "energia" é uma estimativa contra um teto que você configura.

## Idiomas

Botão **PT / EN** no canto superior — português (BR) e inglês (US).

## Status

MVP. Roda local, código aberto. Contribuições bem-vindas.

## Licença

[MIT](LICENSE) © Guilherme Amaral.
