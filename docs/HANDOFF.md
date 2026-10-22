# Handoff — continuidade entre Codex e Claude Code

> Atualizar esta página ao fim de **cada sessão**. Manter histórico breve; informações verificáveis, sem suposições.

## Última sessão
- Ferramenta: Claude Code (DEV e QA feitos em sequência, sem subagentes)
- Data: 2026-10-22
- Objetivo: alinhar docs a 8.000 LP/5 zonas e inicializar o projeto Vite
- Concluído: `AGENTS.md` e `docs/ARQUITETURA.md` alinhados; `git init`; scaffold Vite react-ts (nome `costa-clash`); Vitest; `src/data/cartas.json` + `catalogo.ts`; `src/game/tipos.ts`; teste do catálogo; `App.tsx` placeholder
- Arquivos impactados: `package.json`, `index.html`, `src/**`, `tsconfig*.json`, `vite.config.ts`, `.oxlintrc.json`, `AGENTS.md`, `docs/*`
- Scripts: `npm test` (vitest run), `npm run test:watch`, `npm run typecheck`, `npm run lint` (oxlint), `npm run build`, `npm run dev`
- Testes/build: test 4/4 OK; typecheck, lint e build OK
- Estado Git: branch inicial sem commits; tudo untracked
- Pendências: ver "Decisões pendentes" em `ESTADO_DO_PROJETO.md`
- Segunda tarefa da sessão: diagnóstico e planejamento (sem implementar jogo); criado `docs/PLANO_DE_DESENVOLVIMENTO.md` (leitura obrigatória antes da etapa 1). Verificado por script que `cartas.json`, `src/data/cartas.json` e `cartas.csv` são consistentes.
- Próxima ação indicada: aprovar o plano e iniciar etapas 2–3 do plano (motor puro) e/ou etapa 1 (tabuleiro); motor de turnos puro (`src/game/`) com RNG injetável, compra até 5, fases e combate, com testes da seção 12 das regras

## Modelo para próximas sessões
- Ferramenta e objetivo:
- Mudanças e arquivos:
- Decisões e restrições:
- Testes/build: comandos e resultados:
- Bugs/limitações:
- Estado Git (branch, commit se houver, alterações pendentes):
- Próximo passo:
