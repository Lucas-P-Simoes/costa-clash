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

Não alegar execução se o comando ou dependências não existirem. No início do projeto, configurar os scripts e explicar a instalação.

## Relatório mínimo de QA
Resultado; alterações testadas; comandos executados; contagem de testes; defeitos encontrados com reprodução; limites e riscos remanescentes.
