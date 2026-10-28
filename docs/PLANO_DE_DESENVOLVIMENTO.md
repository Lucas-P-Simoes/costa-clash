# Plano de desenvolvimento — Costa Clash

> Criado em 2026-10-22. Complementa `ARQUITETURA.md` (estrutura) e `REGRAS_DO_JOGO.md` (regras). Em conflito, vale `REGRAS_DO_JOGO.md`. Marcar etapas como concluídas em `ESTADO_DO_PROJETO.md`, não aqui.

## 1. Diagnóstico (estado em 2026-10-22)
- Na fotografia original havia somente `.claude/agents` e `docs` para coordenação. Em 2026-10-25 os papéis foram neutralizados em `.agents/`, com adaptadores para Claude Code e templates de despacho para Codex; ver `AGENTS.md` e `docs/ARQUITETURA.md`.
- `cartas.json` (raiz), `src/data/cartas.json` e `cartas.csv` estão consistentes entre si (verificado por script: 100 cartas, mesmos IDs/nomes/tipos/atributos). A cópia em `src/data` é a usada pelo código.
- Projeto Vite + React 19 + TS + Vitest + oxlint inicializado; 4 testes de catálogo passam; typecheck, lint e build passam. Sem commits.

## 2. Inconsistências e riscos identificados
Resolvidas nesta sessão:
1. Vida/zonas/tamanho do catálogo divergiam entre `AGENTS.md` (4.000 LP, 3 posições, 10 tipos) e `REGRAS_DO_JOGO.md`. Decisão do responsável: **8.000 LP, 5+5 zonas, 40 cartas por baralho, 100 no catálogo**.

Em aberto (decisão do responsável ou do DEV com registro):
2. **Mockup** (`Interface de Batalha Costa Clash.png`): 4.000 LP, mão de 4, sem suporte/terreno/descarte/baralho, nomes de carta fora do catálogo ("Restinga", "Planejamento Urbano"). Usar só como referência de estilo.
3. **Buffs temporários**: §4 fala em "encerrar buffs temporários expirados" no INÍCIO, mas §6 define todos os buffs como duráveis enquanto a unidade estiver em campo. Nenhuma carta tem buff temporário → proposta: ignorar essa etapa no MVP.
4. **Sinal dos valores**: `debuff_grupo` usa valor negativo (-500); `debuff_invocada` usa positivo (+500) e significa redução. Motor deve normalizar por operação, com testes.
5. **Armadilhas sem `subtipo`**; o gatilho fica em `efeito.gatilho` (`ataque_recebido`, `ataque_direto`, `invocacao_impacto`). Tabela das regras mostra "armadilha/".
6. **Empate por repetição de estado (3x)** (§8) é praticamente inalcançável: cada turno consome carta e o baralho (40) acaba. Manter como salvaguarda barata ou cortar.
7. **Ação direcionada sem alvo** (ex.: `debuff_grupo` sem unidade impacto inimiga) é injogável; combinada com a regra de descarte obrigatório (§3) é tratável, mas a IA e a UI precisam mostrar claramente "sem alvo".
8. **Recompensas/progressão** (§10, e item 6 do plano): regras só dizem "desbloqueio por vitória pode ser implementado depois". Falta definir o que é recompensa. Proposta: desbloquear cartas por vitória, salvo em `localStorage`.
9. **Baralhos iniciais** prontos (§10): não existem; o DEV precisa montar baralhos válidos de 40 (máx. 3 por ID) e a QA testá-los. Há só 20 ações+8 armadilhas, então baralhos precisam de composição deliberada.
10. **Aleatoriedade**: RNG deve ser injetável (seed) em baralhos e IA — exigido pelas regras e pelos testes.
11. **Agentes** (resolvido em 2026-10-25): papéis canônicos em `.agents/{dev,qa}.md`, adaptadores em `.claude/agents/` e templates manuais em `.codex/agents/`. A restrição "QA reporta, não corrige produção" continua processual e é reforçada no papel canônico; o coordenador deve serializar DEV → QA.
12. **Exposição de dados**: `src/data/cartas.json` contém a mão/efeitos de todas as cartas; a IA não deve ler mão/baralho humano (§9) — a função da IA deve receber uma *visão* do estado, não o estado completo.

## 3. Arquitetura proposta
```
src/
  data/         cartas.json, catalogo.ts (carrega/valida), baralhos-iniciais.ts
  game/         PURO, sem React/DOM/localStorage/Math.random
    tipos.ts        tipos e constantes (existe)
    rng.ts          RNG com seed (mulberry32) + embaralhar
    baralho.ts      validação (40 cartas, ≤3 cópias, IDs existentes)
    estado.ts       criação do estado inicial, tipos de estado (jogadores, campo, mão, descarte, terreno)
    acoes.ts        comandos: jogarCarta, mudarPosicao, atacar, descartar, passarFase, desistir
    combate.ts      cálculo de ATK/DEF efetivos e resolução de ataque
    efeitos.ts      resolução por `operacao` (tabela operacao -> função)
    armadilhas.ts   gatilhos, prioridade, disparo
    ia.ts           decisão determinística (recebe visão parcial do estado)
    __tests__/      Vitest determinístico
  state/        reducer/hook que liga motor à UI (React) e persistência
  storage/      salvarProgresso/carregarProgresso (localStorage com try/catch e versão)
  components/   Tabuleiro, Zona, CartaView, Mao, PainelTurno, DicaEducativa, EditorBaralho
  styles/       CSS responsivo (variáveis, grid; breakpoints mobile/tablet/desktop)
```
Princípios:
- **Motor**: funções puras `(estado, comando) => { estado, eventos } | { erro }`. Estado imutável e serializável (JSON). Jogada ilegal devolve erro e **não altera** o estado. Eventos (`carta_jogada`, `ataque`, `armadilha_ativada`, `derrota`…) alimentam log/animação/dica educativa sem acoplar a UI.
- **Dados**: catálogo em JSON; `catalogo.ts` valida o formato na carga e é a única porta de acesso.
- **Persistência**: `localStorage` apenas para progresso (cartas desbloqueadas, baralhos salvos, vitórias); chave versionada, leitura tolerante a falha (modo privado/dados corrompidos). Nunca persistir partida em andamento no MVP.
- **UI**: React, CSS responsivo (grid/flex, sem biblioteca de UI). Componentes só despacham comandos e renderizam estado. Sem lógica de regra em componentes.
- **Testes**: Vitest em `src/game/__tests__`; testes de componentes (RTL + jsdom) só quando justificar — não instalado ainda.

## 4. Plano de implementação (etapas)
Cada etapa termina com: testes passando, `typecheck`/`lint`/`build` ok, revisão QA, `ESTADO_DO_PROJETO.md` e `HANDOFF.md` atualizados. Commits só com autorização.

| # | Etapa | Entrega | Critério de pronto |
|---|---|---|---|
| 1 | Estrutura e tabuleiro estático | Layout responsivo (5+5 zonas por lado, mão, terreno, painel, dica) com dados de exemplo | Renderiza em mobile e desktop; revisão visual **do responsável** |
| 2 | Baralhos e distribuição | `rng.ts`, `baralho.ts`, baralhos iniciais, embaralhar, mão inicial de 5, compra até 5 | Testes: validação de baralho, determinismo do RNG, reposição, derrota por compra incompleta |
| 3 | Turnos e combate | Fases, jogar unidade, posições, ataque (ATK×ATK, ATK×DEF, direto), LP, vitória/derrota, descarte forçado | Testes: 1º turno sem ataque, ataque pós-invocação, empates, LP exato 0, jogada ilegal imutável |
| 4 | Efeitos das cartas | Ações instantâneas, equipamentos, terreno, armadilhas (todos os 28 itens) | Teste por `operacao`; terreno afeta ambos; equipamento sai com a unidade; 1 armadilha por evento |
| 5 | Adversário (IA) | `ia.ts` determinística conforme §9, sem acesso a informação oculta | Partidas IA×IA simuladas sem travar; testes de prioridade e de vazamento |
| 6 | Resultado e progresso | Tela de fim, desistência, recompensa (desbloqueio) e `localStorage` | Teste de storage com falha/corrupção; progresso sobrevive a reload |
| 7 | Conteúdo educativo | Dica ao jogar carta, "Saiba mais", até 3 conceitos + 1 questão no fim | Revisão de textos pelo responsável; nada afirma eliminação total de risco |
| 8 | Testes e refinamento | Cobertura, simulação de balanceamento, acessibilidade básica, ajustes de UI | QA completo + revisão visual humana |

Etapas 2–5 não dependem da UI; a etapa 1 pode andar em paralelo apenas se não tocar `src/game/`.

## 5. Responsabilidades DEV × QA
**DEV** (`.agents/dev.md`): implementa a etapa pedida com a menor mudança; mantém motor puro e separado da UI; escreve testes dos próprios comportamentos; registra decisões de regra ambíguas e pergunta em vez de assumir; devolve lista de arquivos, decisões, comandos executados e riscos.

**QA** (`.agents/qa.md`): revisa o diff e os scripts reais; roda `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` conforme o risco; escreve testes de borda e regressão (lista em `TESTING.md` e §12 das regras); **reporta** defeitos de produção com passos de reprodução e não os corrige — volta ao DEV e depois novo QA; não afirma revisão visual.

**Coordenador** (sessão principal, Claude Code ou Codex): DEV → aguarda término → QA → atualiza `ESTADO_DO_PROJETO.md` e `HANDOFF.md`. Nunca há edição DEV/QA concorrente na mesma árvore. Claude Code usa `.claude/agents/`; no Codex, o coordenador cria subagentes dinamicamente com `.codex/agents/`, pois esses arquivos são templates e não auto-descoberta. Sem subagentes, executa os dois papéis em sequência e declara isso.

**Responsável pelo projeto**: aprova regras ambíguas, balanceamento, cores/layout/textos e a revisão visual; autoriza commits.

**Regras iguais em qualquer ferramenta**: `AGENTS.md` é a fonte operacional; `.agents/` define os papéis; `CLAUDE.md`, `.claude/agents/` e `.codex/agents/` apenas adaptam a entrada. Antes de agir, confirmar Git e testes reais, não confiar só no handoff.
