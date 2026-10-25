# Estratégia de testes — Costa Clash

## Objetivo
Proteger regras, detectar regressões e facilitar mudanças. Quantidade de testes não é meta isolada.

## Ferramentas sugeridas
Vitest para lógica TypeScript. Testes de componentes com React Testing Library apenas quando se justificar. Preferir funções puras para regras de jogo e fixtures pequenas e determinísticas.

## Organização sugerida
- `src/game/` para motor de regras e tipos.
- `src/data/` para catálogo de cartas.
- `src/components/` para interface React.
- `src/game/__tests__/` para testes de regras e integração.

## Testes de componentes
`@testing-library/react` + `jsdom` (devDependencies). O ambiente jsdom é escolhido por arquivo com `// @vitest-environment jsdom` na primeira linha; testes do motor continuam em node. Chamar `cleanup` em `afterEach`.

## Prioridades de teste
1. Turnos e mudança de fases.
2. Compra, carta na mão, uso e descarte.
3. Ataque em ataque, ataque em defesa, ataque direto e empate.
4. Dano à vida, destruição e vitória/derrota.
5. Efeitos de carta e interações válidas/inválidas.
6. Jogadas da IA oponente sem travamento.
7. Regressões causadas por novos efeitos.

## Casos de borda mínimos
- Usar carta inexistente na mão.
- Jogar carta sem espaço no tabuleiro.
- Atacar fora do turno ou mais de uma vez sem permissão.
- Vida chegar exatamente a zero.
- Empate ATK/ATK e empate ATK/DEF.
- Estado de jogo encerrado não aceita novas jogadas.
- Deck vazio conforme regra aprovada.

## Política por tipo de mudança
- DEV: escreve testes diretamente afetados e roda os relevantes.
- QA simples: verifica mudança pequena e comandos disponíveis.
- QA completo: executa suíte completa, build, bordas e regressões; padrão para mudanças em motor de regras.
- QA intensivo: cenários longos, combinações de efeitos e testes parametrizados; somente quando o risco exigir.
- Usuário: aprova cores, posicionamento, experiência visual e textos em tela.

## Comandos (configurados em `package.json`)
`npm test` — Vitest, execução única.
`npm run test:watch` — Vitest em modo watch.
`npm run typecheck` — `tsc -b`.
`npm run lint` — oxlint.
`npm run build` — typecheck + build de produção.
Cobertura (`test:coverage`) ainda não configurada.

### Duelo Livre (seleção de adversário)
- `src/data/__tests__/oponentes.test.ts` (node): 16 adversários únicos na ordem da referência, dificuldade 1-3, arquivos de retrato existentes (via `import.meta.glob`), Ressaca padrão, descrições sem "elimina".
- `src/screens/__tests__/dueloLivre.test.tsx` (jsdom): radiogroup/roving tabindex, clique, setas/Home/End e limites, `proximoIndice` com 2 colunas, painel e aria-live, DUELO (aviso, sem iniciar nada), BARALHO (logado/convidado), "Ler mais" (aria-expanded), reanúncio do aviso repetido, grupos/textos revisados, VOLTAR/Esc, integração via App a partir de Convidado e Conta (permanece logada). Em jsdom não há CSS, então o número de colunas cai no padrão 4; o comportamento com 2 colunas (celular) só é coberto em `proximoIndice`.
- Não coberto por testes: layout/responsividade e aparência (verificados manualmente com Chrome headless via CDP em 360, 600, 768, 820x420, 1280, 1448 e 1920 px; sem revisão visual formal).

### Worker (contas/nuvem)
- `npm test` também roda `worker/src/__tests__/*` (ambiente node): `api.test.ts` chama `tratar()` do worker sobre um D1 falso em SQLite em memória (`node:sqlite`, requer Node 22.5+/24) com a migração real (`d1Falso.ts`); `cripto.test.ts`; `baralho.test.ts`.
- `npm run worker:typecheck` — `tsc -p worker/tsconfig.json` (também no CI).
- Validação de integração local (manual): `npm run worker:migrar:local`, `npm run worker:dev` e, noutro terminal, `node worker/scripts/fluxo-local.mjs` (cadastro, login, /me, PUT /baralho válido/inválido, logout, limite de tentativas, CORS). Apague `worker/.wrangler/` para resetar o banco local.
- Ataque paralelo: o QA reproduziu 30 logins e 25 cadastros simultâneos e achou o limite não atômico (corrigido). Cobertura atual: `api.test.ts` ("limites sob concorrência e por IP", via `Promise.all`) e as duas últimas linhas de `fluxo-local.mjs` contra `wrangler dev` (esperado: 5×401 + 25×429; ≤10×201).
- Não coberto por testes automáticos: Worker publicado, D1 remoto, CORS em navegador real.

### Motor de duelo (`src/game/__tests__/`, ambiente node, tudo determinístico por seed)
- `util.ts`: `cenario({humano, oponente, ativo, turno, fase, terreno, ...})` monta um estado arbitrário e válido (campo, suporte, mão, descarte, baralho de enchimento CC-013) e atalhos `jogar`, `atacar`, `ok`. `simular.ts`: `simularIAxIA` (partida completa com a IA nos dois lados).
- `rngBaralho.test.ts`: RNG determinístico/uniforme, Fisher-Yates sem mutar a entrada; validação de baralho (39/41 cartas, >3 cópias, ID desconhecido, erros acumulados, entrada inválida).
- `duelo.test.ts`: `criarDuelo` (mão 5, baralho 35, humano no turno 1, serializável, seed, baralhos inválidos), reposição da mão, derrota por compra incompleta (sem compra parcial; mão cheia + baralho vazio não perde), primeiro turno sem ataque, desistência, estado encerrado imutável, empate duplo (estado construído) e repetição 3x.
- `acoes.test.ts`: fases/turno, uma jogada por turno, zona escolhida × primeira livre, campo/suporte cheios, descarte forçado (só sem jogada legal), posições (inclusive após atacar), validação no motor, comandos inválidos devolvem o mesmo objeto, imutabilidade (entrada congelada), `jogadasLegais`/`ataquesLegais`.
- `combate.test.ts`: ATK×ATK (maior/menor/empate), ATK×DEF (destrói sem dano; menor causa dano ao atacante; empate nada; sem transbordo), ataque direto, LP exato 0 e clamp, restrições de ataque, atributos efetivos (clamp >= 0), terreno nos dois lados.
- `efeitos.test.ts`: uma bateria por `operacao` (debuff/buff de grupo, buff de unidade, destruir, cura com clamp 8000, revelar, equipamentos, terrenos), buffs persistentes, equipamento sai com a unidade, alvo inválido/ausente, ação sem alvo injogável, cobertura das 20 ações do catálogo.
- `armadilhas.test.ts`: as 8 armadilhas e seus gatilhos, prioridade pela mais antiga, uma por evento, inelegibilidade (fica armada), nunca no turno de colocação (estado construído) e fluxo real com colocação no turno 1.
- `ia.test.ts`: visão parcial sem vazamento (JSON da visão sem uids/cartas ocultas; decisão idêntica quando só muda a informação oculta), prioridades do §9, posições, ataques, descarte, `executarTurnoIA` (turno completo, determinismo, estado encerrado, vitória e derrota por compra durante o turno).
- `simulacao.test.ts`: 51 partidas IA×IA (inicial + 16 oponentes) terminam em <= 74 turnos, sem exceção, sem `ia_fallback`, com invariantes (LP em [0, 8000], zonas <= 5, total de 40 cartas por jogador, equipamentos consistentes, uids únicos); reprodutível por seed.
- `propriedade.test.ts`: 80 partidas com baralhos aleatórios do catálogo inteiro e comandos aleatórios (legais e ilegais) sobre estados **congelados** (qualquer mutação lança erro); toda jogada ilegal devolve o mesmo estado; invariantes e serialização JSON após cada comando aceito.
- `estatisticas.test.ts`: só com `STATS=1` (`STATS=1 npx vitest run src/game/__tests__/estatisticas.test.ts --reporter=verbose --silent=false`): todas as 289 combinações ordenadas de baralhos x 2 seeds (578 partidas) e imprime resultados/duração. Resultados na última rodada: `docs/ESTADO_DO_PROJETO.md`.
- `src/data/__tests__/baralhosOponentes.test.ts`: os 16 baralhos válidos, temáticos, com ações/armadilhas e dificuldade só pela composição; o worker reexporta o mesmo baralho inicial.

### Tela do duelo (`src/screens/__tests__/duelo.test.tsx`, jsdom, duelos semeados/cenários montados por `cenario()`)
- `CartaView`/`CartaVerso` e textos de efeito; leitura do tabuleiro (8000 LP, 5+5 zonas, mão, restantes); jogar unidade por modo guiado, posição de entrada/troca em campo; ação com alvo (destaque e efeito); ação sem alvo e descarte forçado com motivo; ataque (atacante -> alvo) e ataque direto; ATACAR no turno 1/antes da jogada; ENCERRAR TURNO + turno da IA (sem atraso e com timers falsos, entrada bloqueada); informação oculta (nenhum nome/ID da mão ou armadilha do oponente no DOM, nem em duelo real semeado; armadilha própria visível, do oponente só com `revelar`); desistência com confirmação, resultado (derrota/vitória, conceitos), JOGAR NOVAMENTE; integração com o Duelo Livre (convidado, logado, baralho inválido, adversário inexistente).
- `src/game/__tests__/logPublico.test.ts`: `logPublico`/`eventosPublicos`, rng 1.0, evento `desistencia`.
- Não coberto por testes automáticos: aparência/layout (medido manualmente no navegador embutido; ver HANDOFF), animação real da reprodução, leitor de tela.

- `src/screens/__tests__/duelo_correcoes.test.tsx` (jsdom): desistir durante a reprodução da IA com timers falsos e limpeza ao desmontar, foco e `inert` dos diálogos (foco inicial, Tab preso, retorno ao acionador), foco guiado (zona, alvo, ataque), seleção mantida após DEFENDER, modo zerado no fim, textos (terreno, subtítulo, rodada, log de armadilha). `qa_duelo_ui.test.tsx` e `qa_fase_b.test.ts` são do QA.

Não alegar execução se o comando ou dependências não existirem. No início do projeto, configurar os scripts e explicar a instalação.

- `src/screens/__tests__/duelo_visual.test.tsx` (jsdom, redesenho visual, 2026-10-23): `MolduraOrnamentada` (filhos no miolo, 4 cantos aria-hidden, tom, aba opcional, `as`), painéis OPONENTE/VOCÊ (avatar, vida, contagens, 5 zonas, 5 suportes, versos da mão), coluna lateral (banner aria-live, botões com ícone/subtítulo, motivo visível ligado por `aria-describedby`, dica com ícones), posição ataque/defesa (ícone + classe), faixa de terreno (+ `efeitoTerreno`), animações como classes temporárias que expiram (entrada, ataque, destruição com fantasma, dano, impacto, turno), `prefers-reduced-motion` (matchMedia simulado), ação logo após o ataque sem esperar a animação, e a tela de resultado (derrota/vitória, resumo só com números públicos, recompensas "em breve", foco inicial). `src/components/duelo/__tests__/efeitosVisuais.test.tsx`: `derivarEfeitos` pura e o hook com timers falsos (expiração, soma de lotes, limpeza ao desmontar, reduced-motion).
- Validação visual (manual, fora do Vitest): Chrome headless via CDP em 1459x1078 (proporção da referência), 1280x720, 768x1024, 375x812 (e 360x740, 812x375), conferindo rolagem horizontal, imagens quebradas, console e rede; também sobre `npm run build` + `vite preview` (base `/costa-clash/`). Sem teste de comparação de pixels (política do projeto).

- Pós-QA do redesenho (`duelo_visual.test.tsx`, grupo "Correções pós-QA"): estrutura e regras de CSS do resultado (cena em contêiner, botões sticky, `preventScroll`), CSS sem `break-word` e carta com `title`, aviso limpo ao mudar de turno (timers falsos) e motivo de botão bloqueado por teclado (foco mantido, `aria-live`). Alturas e cortes reais só por captura (Chrome headless/CDP).

- `src/screens/__tests__/duelo_arrasto.test.tsx` (jsdom; eventos `pointerdown/move/up` e `document.elementFromPoint` simulado): arrastar unidade/armadilha/equipamento/ação com alvo/terreno/cura, resultado igual ao do fluxo por botão (comparação do tabuleiro e do log), posição pendente (defesa), destaques e fantasma durante o arrasto, zona ocupada e fora do campo (motivo, estado intacto), Esc, bloqueios (jogada feita, IA), clique simples e clique após o arrasto, dica e desmontagem. Carta deitada: `duelo_visual.test` (`data-posicao`, regras de CSS da rotação/transição/reduced-motion, fantasma deitado) e `efeitosVisuais.test` (posição do fantasma). Toque real e geometria da carta deitada: só por captura (CDP `Input.dispatchMouseEvent`/`dispatchTouchEvent`).

- `src/screens/__tests__/duelo_toque.test.tsx`: pressão longa por toque (timers falsos), cancelamento por movimento antes do prazo, tolerância de 8 px, soltar sem mover, toque curto, bloqueios, `touchmove` cancelado só com arrasto ativo, limiar de 10 px do mouse, dica por `(pointer: coarse)`, tela baixa em paisagem, `nomeCurto`/nomes por container query e CSS do selo de posição. Validação por CDP (fora do Vitest): rolagem da página por toque sobre a mão, pressão longa + arrasto e 72 unidades x 2 posições x 6 viewports sem nome nem selo cortados.

## Relatório mínimo de QA
Resultado; alterações testadas; comandos executados; contagem de testes; defeitos encontrados com reprodução; limites e riscos remanescentes.

### Arte das cartas (`src/arte/__tests__/`)
- `prompts.test.ts`: 100 sujeitos (IDs = catálogo, nenhum vazio/duplicado, exemplos do dono, sem "elimina"), prompts determinísticos terminando nos negativos, sem nome da carta/ID/ATK/DEF fora dos negativos. `categorias.test.ts`: mapa categoria->cor/selo, 100 cartas classificadas, pictogramas 12x12. `manifesto.test.ts`: sincronização pura (estados preservados, aprovada intocável) e manifesto real (100 entradas, 5 provisorias + 95 pendentes, sha256 dos arquivos, sem deriva do manifesto/índice). `verificar.test.ts`: PNG/WebP temporários válidos, inválidos, duplicados, proporção, extensão, provisória só com avisos. `gerar.test.ts`: dry-run e provedor FALSO em diretório temporário (o teste confere que `public/assets/cards/art/` não muda). `integracao.test.tsx` (jsdom): CartaView com/sem arte, erro de carregamento, página `?arte=1`, copiar prompt.
- Scripts: `npm run arte:manifesto|arte:verificar|arte:prompts|arte:gerar`. Não coberto: aparência real das molduras (verificada só por captura headless, sem revisão formal) e qualquer provedor real.

