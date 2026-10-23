# Handoff — continuidade entre Codex e Claude Code

> Atualizar esta página ao fim de **cada sessão**. Manter histórico breve; informações verificáveis, sem suposições.

## Sessão: tela de login (DEV, Claude Code)
- Data: 2026-10-22. Sem commit (conforme pedido); tudo está só na working tree.
- Criado: `src/styles/{tokens,base,componentes}.css`; `src/components/ui/{PixelArt,grades,Icones,MolduraPedra,BotaoRetro,CampoRetro,CabecalhoTela,RodapeControles,useAtalhoVoltar}`; `src/screens/login/{TelaLogin,PainelFormulario,PainelInformativo,login.css}`; `src/screens/{TelaSimples,Placeholders}.tsx` + `telaSimples.css`; `src/auth/{validacao,servicoAuth}.ts`; testes `src/auth/__tests__/validacao.test.ts`, `src/screens/__tests__/login.test.tsx`; `src/assets/login/*.png`; `.claude/launch.json` (preview dev na porta 5173).
- Modificado: `src/App.tsx` (navegação por estado), `src/main.tsx` (imports de CSS), `package.json`/`package-lock.json` (devDeps: jsdom, @testing-library/react, @testing-library/dom). Removido: `src/index.css` (demo).
- Não tocado: `src/game/`, regras do duelo.
- Decisões: (1) recortes de `Referencia-telas/Tela-Login.png` (sem texto/UI) viram `cena-mangue`, `topo-esquerda`, `topo-direita`, `cidade-noite` (cortados via System.Drawing do PowerShell, script fora do projeto); `topo-*` serão reaproveitados pelo cabeçalho de outras telas. Logo, título, molduras, botões e todos os ícones são CSS/SVG (pixel art por grades de caracteres em `grades.ts`). (2) Fonte: sem download; pilha de sistema monoespaçada (Lucida Console/Consolas/Courier New) e Impact/Arial Black para logo/título — o visual varia por SO; embutir fonte pixel livre é pendência. (3) `ServicoAuth` + `servicoAuthNaoConfigurado` (erro "Login com conta ainda não está disponível. Você pode jogar como convidado."); nunca simula sucesso. `App` aceita `servicoAuth` por prop (usado só em testes); se um serviço retornar ok, vai a uma tela provisória "Conectado como ...". (4) Senha só com espaços é rejeitada; senha nunca é "trimada"; e-mail é enviado com trim. Nada é persistido. (5) Botão ocupado usa `aria-disabled` (mantém foco) em vez de `disabled`. (6) Esc volta nas telas provisórias; Enter já envia o formulário.
- Comandos: `npm test` 37/37 OK (3 arquivos: catálogo, validação, login/navegação); `npm run typecheck`, `npm run lint`, `npm run build` OK.
- Diferenças conhecidas vs. referência: texturas de pedra são gradientes (não pixel art pintada); molduras sem os ornamentos de espiral; ícones desenhados em grades pequenas (livro, cartas, escudo+tartaruga, ondas) são mais simples que os da arte; logo usa fonte de sistema, não as letras de pedra; painel APRENDA sem folhagem de fundo; cena esquerda é recorte cover (em 1920 px a cena é ampliada e cortada, container limitado a 1700 px); no tablet/celular a cena vira fundo esmaecido e o painel educativo vai abaixo.
- Riscos p/ QA: ordem de foco/leitor de tela (cena e ornamentos são aria-hidden); contraste dos textos sobre a cena esmaecida; fonte ausente no SO do usuário muda larguras; `cena-mangue.png` pesa ~900 KB; testes de componente usam `fireEvent.submit` (não user-event).
- Correções pós-QA (login): (1) `.campo__reserva` reserva ~44px para a mensagem de erro (sem deslocar layout) e blur de campo vazio não valida mais (só no envio); (2) região `sr-only role=status aria-live=polite` anuncia "Entrando..." e `.botao__ocupado` agora é indicador visual no botão primário ocupado; (3) ao voltar das telas provisórias o foco vai para o campo E-mail (`focarAoMontar`; carga inicial não foca). Arquivos: `CampoRetro.tsx`, `BotaoRetro.tsx`, `PainelFormulario.tsx`, `TelaLogin.tsx`, `App.tsx`, `componentes.css`, `login.css`, `login.test.tsx` (+4 testes). Resultado: npm test 57/57 (4 arquivos), typecheck/lint/build OK. Item 4 (altura/rolagem) não alterado. O espaçamento entre campos mudou levemente (margem do campo trocada pela reserva do erro).
- Próximo passo: revisão do responsável e QA; depois tela Duelo Livre (`Referencia-telas/Duelo-Livre-tela.PNG`) reutilizando `CabecalhoTela`, `MolduraPedra`, `BotaoRetro`, `RodapeControles`.

## Sessão anterior (setup)
- Ferramenta: Claude Code (DEV e QA feitos em sequência, sem subagentes)
- Data: 2026-10-22
- Objetivo: alinhar docs a 8.000 LP/5 zonas e inicializar o projeto Vite
- Concluído: `AGENTS.md` e `docs/ARQUITETURA.md` alinhados; `git init`; scaffold Vite react-ts (nome `costa-clash`); Vitest; `src/data/cartas.json` + `catalogo.ts`; `src/game/tipos.ts`; teste do catálogo; `App.tsx` placeholder
- Arquivos impactados: `package.json`, `index.html`, `src/**`, `tsconfig*.json`, `vite.config.ts`, `.oxlintrc.json`, `AGENTS.md`, `docs/*`
- Scripts: `npm test` (vitest run), `npm run test:watch`, `npm run typecheck`, `npm run lint` (oxlint), `npm run build`, `npm run dev`
- Testes/build: test 4/4 OK; typecheck, lint e build OK
- Estado Git: branch `main`, remoto `origin` = https://github.com/Lucas-P-Simoes/costa-clash (público). Commit inicial 840592d enviado.
- Hospedagem: GitHub Pages por Actions (`.github/workflows/deploy.yml`, roda testes+build a cada push na `main`). Site: https://lucas-p-simoes.github.io/costa-clash/ (HTTP 200 verificado). `vite.config.ts` usa `base: '/costa-clash/'`; `npm run dev` abre em `/costa-clash/`.
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
