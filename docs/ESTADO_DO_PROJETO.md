# Estado do projeto — atualizar ao final de cada sessão

## Situação atual
- Valores oficiais confirmados pelo responsável (2026-10-22): **8.000 LP, 5 zonas de unidade + 5 de suporte**, baralho de 40 cartas, catálogo de 100. `AGENTS.md` e `docs/ARQUITETURA.md` alinhados a `docs/REGRAS_DO_JOGO.md`.
- Projeto Vite + React 19 + TypeScript + Vitest inicializado (repositório público em https://github.com/Lucas-P-Simoes/costa-clash, deploy automático em https://lucas-p-simoes.github.io/costa-clash/).
- Tela de LOGIN implementada (2026-10-22, DEV; sem revisão visual do responsável nem QA ainda). Motor de jogo ainda não existe.

## Tela Duelo Livre (2026-10-22, DEV; sem QA nem revisão visual do responsável)
- Implementada a seleção de adversário (16 adversários, grade 4x4, painel de detalhe com dificuldade em conchas, DUELO/BARALHO/VOLTAR), acessível por "Duelo livre" na tela Conta e na tela de Convidado. O motor de duelo NÃO existe: DUELO mostra o aviso "Em breve — o duelo contra {nome} ainda está em desenvolvimento." e não inicia nada. BARALHO mostra a contagem do baralho do perfil (logado) ou "Em breve" (convidado/sem dado).
- **Provisório, aguarda revisão do dono**: as descrições dos 15 adversários (a de Ressaca vem da referência) e as dificuldades (1-3) em `src/data/oponentes.ts`. Não há baralho nem balanceamento por adversário.
- Arte: 16 retratos + arte grande de Ressaca recortados de `Referencia-telas/Duelo-Livre-tela.PNG` (ver HANDOFF).
- Correções pós-QA aplicadas (painel acessível sem rolar, "Ler mais", aria-live, grupos/textos; ver HANDOFF). Descrições, dificuldades e grupos seguem provisórios.
- `npm test`: 158/158 (12 arquivos; 138 anteriores preservados + 20 novos); typecheck, worker:typecheck, lint, build sem erros.

## Contas e nuvem (2026-10-22, DEV; sem QA nem revisão visual ainda)
- Implementados no repositório: API de contas em `worker/` (Cloudflare Worker + D1: cadastro, login, logout, /me, PUT /baralho, /saude), tela real de Criar conta, tela provisória Conta (e-mail, contagens, SAIR), restauração de sessão via GET /me, `servicoAuthHttp` (usa `VITE_API_URL`; sem ela, "não configurado"). Baralho/coleção iniciais provisórios (40 cartas). Detalhes, riscos e passos do dono: `docs/CONTAS_E_NUVEM.md`.
- **Nada provisionado/publicado**: falta criar o D1, preencher `database_id` em `worker/wrangler.toml`, migrar, `worker:deploy`, definir variável `VITE_API_URL` no GitHub e fazer push. Enquanto isso o site publicado continua só com convidado.
- Pendências: verificação de e-mail e recuperação de senha (exigem provedor de e-mail), exclusão de conta, política de privacidade/LGPD (menores), recompensa de cartas no servidor, editor de baralho, decisão sobre baralho inicial (`REGRAS_DO_JOGO.md` §10 fala em liberar as 100 no protótipo).

- **Decisão pendente do dono**: `REGRAS_DO_JOGO.md` §10 (liberar as 100 cartas no protótipo) × coleção inicial = baralho inicial de 40 cartas (implementado conforme pedido). §10 não foi alterado.
- Correções pós-QA (2026-10-22): limites de login/cadastro atômicos e limite de login por IP (30/15 min); hash antes do 409; Bearer sem diferenciar caixa; barra final em /api/me/; e-mail NFKC + IDN recusado; aviso de reconexão; timeout 8 s. `npm test` 138/138.

## Diagnóstico e plano
- Diagnóstico, 12 inconsistências, arquitetura, plano de 8 etapas e papéis DEV/QA: `docs/PLANO_DE_DESENVOLVIMENTO.md`.
- Etapa atual do plano: **nenhuma concluída**; aguardando aprovação para iniciar a etapa 1 (tabuleiro) e/ou 2–3 (baralho, turnos, combate).

## Nuvem
- API de contas publicada em https://costa-clash-api.lucaspsimoes22.workers.dev (Cloudflare Worker + D1); site ligado via `VITE_API_URL`. Detalhes em `docs/CONTAS_E_NUVEM.md`.

## Funcionalidades concluídas
- Catálogo em `src/data/cartas.json` (cópia do `cartas.json` da raiz) com carregador `src/data/catalogo.ts`.
- Tipos e constantes do jogo em `src/game/tipos.ts`.
- Testes do catálogo (`src/game/__tests__/catalogo.test.ts`): 100 IDs/nomes únicos, 72/20/8 por tipo, atributos válidos, faixas de ID.

- Tela de login (`src/screens/login/`), componentes retrô reutilizáveis (`src/components/ui/`, `src/styles/`), validação pura e interface `ServicoAuth` (`src/auth/`), telas provisórias (criar conta, recuperar senha, convidado) e navegação por estado em `src/App.tsx`. NÃO há backend: o serviço padrão é "não configurado" e nunca autentica.
- Testes: `src/auth/__tests__/validacao.test.ts` e `src/screens/__tests__/login.test.tsx` (jsdom + Testing Library, ambiente por arquivo).

## Tarefa em andamento
- Nenhuma. Próxima: motor de turnos/combate puro em `src/game/`.

## Decisões pendentes
- Mockup `Interface de Batalha Costa Clash.png` mostra 4.000 LP, mão de 4 e sem áreas de suporte/terreno/descarte/baralho; precisa de nova versão ou aprovação de ajuste.
- Sinal inconsistente em `cartas.json`: `debuff_grupo` usa valor negativo, `debuff_invocada` usa positivo (o motor deve tratar explicitamente).
- Armadilhas não têm `subtipo`; o gatilho está em `efeito.gatilho`.
- Duas cópias do catálogo (raiz e `src/data`): definir qual é a fonte e remover a outra, ou manter sincronizadas.

## Pendências da tela de login
- Revisão estética pelo responsável; QA ainda não feito. Diferenças conhecidas vs. referência: ver `docs/HANDOFF.md`.
- Backend de autenticação inexistente (decisão de produto pendente); fonte pixel dedicada não incluída.

## Última verificação (contas/nuvem, 2026-10-22)
- `npm test`: 129 testes (10 arquivos) passando (57 anteriores preservados; 1 linha de teste de navegação ajustada); `npm run typecheck`, `npm run worker:typecheck`, `npm run lint`, `npm run build`: sem erros.
- `wrangler dev --local` + D1 local migrado + `worker/scripts/fluxo-local.mjs`: fluxo completo OK (ver HANDOFF). Interface da nova tela não aberta no navegador nem revisada visualmente.

## Verificação anterior (login, 2026-10-22)
- `npm test`: 37 testes (3 arquivos) passando; `npm run typecheck`, `npm run lint`, `npm run build`: sem erros.
- Aberta no navegador (dev) em 1448, 1920, 1280, 768, 375 e 360 px: sem rolagem horizontal. Sem revisão visual formal.

## Verificação anterior
- `npm test`: 4 testes passando. `npm run typecheck`, `npm run lint` e `npm run build`: sem erros.
- Interface não revisada visualmente nem aberta no navegador.
