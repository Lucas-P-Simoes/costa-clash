# Estado do projeto — atualizar ao final de cada sessão

## Situação atual
- Valores oficiais confirmados pelo responsável (2026-10-22): **8.000 LP, 5 zonas de unidade + 5 de suporte**, baralho de 40 cartas, catálogo de 100. `AGENTS.md` e `docs/ARQUITETURA.md` alinhados a `docs/REGRAS_DO_JOGO.md`.
- Projeto Vite + React 19 + TypeScript + Vitest inicializado (repositório público em https://github.com/Lucas-P-Simoes/costa-clash, deploy automático em https://lucas-p-simoes.github.io/costa-clash/).
- Tela atual é apenas um placeholder; motor de jogo ainda não existe.

## Diagnóstico e plano
- Diagnóstico, 12 inconsistências, arquitetura, plano de 8 etapas e papéis DEV/QA: `docs/PLANO_DE_DESENVOLVIMENTO.md`.
- Etapa atual do plano: **nenhuma concluída**; aguardando aprovação para iniciar a etapa 1 (tabuleiro) e/ou 2–3 (baralho, turnos, combate).

## Funcionalidades concluídas
- Catálogo em `src/data/cartas.json` (cópia do `cartas.json` da raiz) com carregador `src/data/catalogo.ts`.
- Tipos e constantes do jogo em `src/game/tipos.ts`.
- Testes do catálogo (`src/game/__tests__/catalogo.test.ts`): 100 IDs/nomes únicos, 72/20/8 por tipo, atributos válidos, faixas de ID.

## Tarefa em andamento
- Nenhuma. Próxima: motor de turnos/combate puro em `src/game/`.

## Decisões pendentes
- Mockup `Interface de Batalha Costa Clash.png` mostra 4.000 LP, mão de 4 e sem áreas de suporte/terreno/descarte/baralho; precisa de nova versão ou aprovação de ajuste.
- Sinal inconsistente em `cartas.json`: `debuff_grupo` usa valor negativo, `debuff_invocada` usa positivo (o motor deve tratar explicitamente).
- Armadilhas não têm `subtipo`; o gatilho está em `efeito.gatilho`.
- Duas cópias do catálogo (raiz e `src/data`): definir qual é a fonte e remover a outra, ou manter sincronizadas.

## Última verificação
- `npm test`: 4 testes passando. `npm run typecheck`, `npm run lint` e `npm run build`: sem erros.
- Interface não revisada visualmente nem aberta no navegador.
