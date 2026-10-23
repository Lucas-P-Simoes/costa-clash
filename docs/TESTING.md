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

### Worker (contas/nuvem)
- `npm test` também roda `worker/src/__tests__/*` (ambiente node): `api.test.ts` chama `tratar()` do worker sobre um D1 falso em SQLite em memória (`node:sqlite`, requer Node 22.5+/24) com a migração real (`d1Falso.ts`); `cripto.test.ts`; `baralho.test.ts`.
- `npm run worker:typecheck` — `tsc -p worker/tsconfig.json` (também no CI).
- Validação de integração local (manual): `npm run worker:migrar:local`, `npm run worker:dev` e, noutro terminal, `node worker/scripts/fluxo-local.mjs` (cadastro, login, /me, PUT /baralho válido/inválido, logout, limite de tentativas, CORS). Apague `worker/.wrangler/` para resetar o banco local.
- Ataque paralelo: o QA reproduziu 30 logins e 25 cadastros simultâneos e achou o limite não atômico (corrigido). Cobertura atual: `api.test.ts` ("limites sob concorrência e por IP", via `Promise.all`) e as duas últimas linhas de `fluxo-local.mjs` contra `wrangler dev` (esperado: 5×401 + 25×429; ≤10×201).
- Não coberto por testes automáticos: Worker publicado, D1 remoto, CORS em navegador real.

Não alegar execução se o comando ou dependências não existirem. No início do projeto, configurar os scripts e explicar a instalação.

## Relatório mínimo de QA
Resultado; alterações testadas; comandos executados; contagem de testes; defeitos encontrados com reprodução; limites e riscos remanescentes.
