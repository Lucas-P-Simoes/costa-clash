# Estado do projeto — atualizar ao final de cada sessão

## Situação atual
- Valores oficiais confirmados pelo responsável (2026-10-22): **8.000 LP, 5 zonas de unidade + 5 de suporte**, baralho de 40 cartas, catálogo de 100. `AGENTS.md` e `docs/ARQUITETURA.md` alinhados a `docs/REGRAS_DO_JOGO.md`.
- Projeto Vite + React 19 + TypeScript + Vitest inicializado (repositório público em https://github.com/Lucas-P-Simoes/costa-clash, deploy automático em https://lucas-p-simoes.github.io/costa-clash/).
- Tela de LOGIN implementada (2026-10-22, DEV; sem revisão visual do responsável nem QA ainda). Motor de duelo implementado em `src/game/` (fase A, sem UI; ver seção abaixo).

- **Modo convidado REMOVIDO (decisão do dono, 2026-10-25)**: jogar exige conta (Login -> Conta -> Duelo livre). Também removidos o conjunto de controles decorativos do rodapé e os ornamentos do título só no login. Pendências agravadas: política de privacidade/LGPD e recuperação de senha (ainda placeholder). Detalhes em `docs/HANDOFF.md`.

- Login: o título "Login" (h1) fica dentro do painel do formulário, acima de E-MAIL; o cabeçalho do login tem só logo/subtítulo (2026-10-25).

## Responsividade global (2026-10-25, DEV; sem QA nem revisão visual do dono)
- Escala fluida (`html { font-size: clamp(14px, min(100dvw/90, 100dvh/56.25), 26px) }`), tokens e layout `.tela-jogo` em `src/styles/responsivo.css`; todas as telas migradas para rem e compactação por altura. Desktop (>= 1024x560 sem toque): login, criar conta, conta, recuperar, Duelo Livre, duelo e resultado cabem sem rolagem da página em 24 viewports medidos (inclui 4K, alturas efetivas, zoom 125/150%); celular/tablet retrato rolam naturalmente. `npm run test:e2e` (Playwright + Chrome do sistema) guarda isso. Revisão de QA (mão colapsada, barra de ações coberta, ATK/DEF cortados) corrigida e coberta pelo e2e (159 testes; matriz de 34 viewports sem falhas). Detalhes e matriz em `docs/HANDOFF.md`. Menu principal, seleção de cartas, montagem de baralho e coleção ainda não existem.

## Redesenho visual do tabuleiro de batalha (2026-10-23, DEV; sem QA nem revisão visual do dono)
- Tabuleiro redesenhado para se aproximar de `Referencia-telas/Motor-Duelo.png`: cabeçalho com cenário noturno recortado da referência (lua, farol, mar, palmeiras), emblema, logotipo, subtítulo e faixa-frase; molduras de pedra ornamentadas reutilizáveis (`MolduraOrnamentada`); painéis OPONENTE (monitor vermelho) e VOCÊ (pessoa azul) com VIDA, contagens, 5 zonas (losango) e faixa de 5 suportes; mão com cartas temáticas; coluna direita com banner TURNO, botões ATACAR/DEFENDER/USAR CARTA/ENCERRAR TURNO com ícones, DESISTIR, CARTAS RESTANTES e DICA EDUCATIVA; faixa central de TERRENO com o efeito; posição ataque/defesa por ícone; animações CSS leves (reduced-motion respeitado); tela de resultado no estilo de Tela-derrota/Tela-recompensa (sem recompensa inventada). Motor, regras e fluxos intactos.
- `npm test`: 635 passaram + 1 ignorado (39 arquivos; 608 anteriores intactos + 27 novos); typecheck, lint e build sem erros. Validado em Chrome headless (1459x1078, 1280x720, 768x1024, 375x812; dev e build+preview em `/costa-clash/`): sem rolagem horizontal, sem imagem quebrada, sem erro no console. Fidelidade NÃO é perfeita (diferenças em docs/HANDOFF.md). Revisão estética e dispositivos reais: pendentes (dono).

- Correções pós-QA do redesenho (D1–D6) aplicadas em 2026-10-23: resultado cabe em 1280x720/1366x768/812x375, nomes por palavra, alvos de toque >=40/44 px, registro visível no desktop baixo, aviso vencido some na troca de turno. `npm test` 639 passaram + 1 ignorado; typecheck, worker:typecheck, lint e build OK. Detalhes: HANDOFF.

- 2026-10-23: unidade em defesa agora aparece deitada (90°; carta de campo 3:4 em contêiner de zona) e a carta da mão pode ser arrastada ao campo (Pointer Events, mesmo caminho do USAR CARTA; clique/teclado continuam). `npm test` 661 passaram + 1 ignorado; typecheck, worker:typecheck, lint e build OK. Toque só validado por emulação. Detalhes: HANDOFF.

- 2026-10-24: correções do QA da carta deitada/arrasto: arrasto por toque só após pressão longa (a página rola normalmente sobre a mão; limiar de 10 px no mouse), nomes de carta de campo sem letras cortadas (abreviação por palavra em cartas estreitas; 0 cortes em 72 unidades x 6 viewports), selo de posição legível (10 px), arrasto desligado em celular de paisagem baixa. `npm test` 680 passaram + 1 ignorado; typecheck, worker:typecheck, lint e build OK. Toque real não validado.

## Tela do duelo (fase B, 2026-10-22, DEV; sem QA da UI nem revisão visual do dono)
- A tela do duelo existe e está ligada ao botão DUELO do Duelo Livre (adversário escolhido, baralho do perfil ou inicial). Detalhes, decisões, diferenças vs. a referência e riscos: `docs/HANDOFF.md` (primeira seção). Correções do QA do motor (QA-1/2/3, `logPublico`) aplicadas.
- Correções pós-QA D1-D13 aplicadas (ver HANDOFF). `npm test`: 533 passaram + 1 ignorado (32 arquivos); typecheck, worker:typecheck, lint, build sem erros. Verificado no navegador embutido em 1448/1280/768/375/360 px (sem rolagem horizontal) e um duelo completo jogado por script. Revisão estética e dispositivos reais: pendentes (dono).
- Pendências: recompensas e progresso ("em breve"), arte individual das cartas, decisões do dono (elegibilidade de armadilha, balanceamento, 'evitar estagnação').

## Motor de duelo — fase A (2026-10-22, DEV; sem QA, sem UI, sem commit)
- Implementado em `src/game/` o motor puro e determinístico (RNG com seed, validação de baralho, estado, comandos, combate, efeitos por `operacao`, armadilhas, visão parcial, IA §9, `criarDuelo`, `executarTurnoIA`) e `src/data/baralhosOponentes.ts` (16 baralhos provisórios de 40). API e eventos: `docs/ARQUITETURA.md`; decisões de regra (provisórias, algumas pedem confirmação do dono): `docs/REGRAS_DO_JOGO.md` §15. A etapa 2-5 do plano (motor) está **implementada, aguardando QA**; a UI do duelo (fase B) ainda não existe e o botão DUELO continua mostrando "Em breve".
- `src/data/baralhoInicial.ts` passou a ser a fonte do baralho inicial; `worker/src/inicial.ts` só reexporta (API idêntica).
- Verificação: `npm test` **401 passaram + 1 ignorado** (23 arquivos; 158 anteriores preservados + 243 novos; o ignorado é o gerador de estatísticas, que exige `STATS=1`), `npm run typecheck`, `npm run worker:typecheck`, `npm run lint` e `npm run build`: sem erros.
- **Simulações IA×IA** (578 partidas: todas as combinações ordenadas dos 17 baralhos — inicial + 16 oponentes — com 2 seeds): 0 travamentos, 0 exceções, 0 `ia_fallback`, 0 violações de invariante. Resultado por LP em 492 (85%) e por falta de cartas na reposição em 86 (15%); 0 empates. Duração: mínimo 5, mediana 13, média 25,5 e máximo 73 turnos absolutos (teto teórico 74); ~13 ms por partida. Quem joga primeiro (humano) venceu 251 (43%), quem joga em segundo 327 (57%): o segundo jogador ataca primeiro (o humano não ataca no turno 1). Taxa de vitória por baralho: ressaca 91%, chuva-intensa 90%, porto 87%, erosão 78%, planejamento 62%, biodiversidade 60%, poluição 59%, urbanização 59%, inicial 43%, recuperação 41%, coral 37%, fiscal 31%, restinga 26%, caiçara 24%, guardião 22%, pescador 22%, tartaruga 19%. **Leitura**: baralhos de grupo `impacto` (ATK alto, DEF baixa) dominam; dificuldade "fácil" ficou de fato mais fraca, mas a diferença entre os grupos é grande. Balanceamento é provisório e NÃO foi ajustado (não mexi em catálogo nem regras).
- Não validado: nenhuma interface (não há UI do duelo); jogabilidade subjetiva da IA; balanceamento fino; só foi simulada IA×IA, não partidas com humano real.

## Tela Duelo Livre (2026-10-22, DEV; sem QA nem revisão visual do responsável)
- Implementada a seleção de adversário (16 adversários, grade 4x4, painel de detalhe com dificuldade em conchas, DUELO/BARALHO/VOLTAR), acessível por "Duelo livre" na tela Conta e (histórico: tela de Convidado, removida). O motor de duelo NÃO existe: DUELO mostra o aviso "Em breve — o duelo contra {nome} ainda está em desenvolvimento." e não inicia nada. BARALHO mostra a contagem do baralho do perfil (logado) ou "Em breve" (sem dado).
- **Provisório, aguarda revisão do dono**: as descrições dos 15 adversários (a de Ressaca vem da referência) e as dificuldades (1-3) em `src/data/oponentes.ts`. Não há baralho nem balanceamento por adversário.
- Arte: 16 retratos + arte grande de Ressaca recortados de `Referencia-telas/Duelo-Livre-tela.PNG` (ver HANDOFF).
- Correções pós-QA aplicadas (painel acessível sem rolar, "Ler mais", aria-live, grupos/textos; ver HANDOFF). Descrições, dificuldades e grupos seguem provisórios.
- `npm test`: 158/158 (12 arquivos; 138 anteriores preservados + 20 novos); typecheck, worker:typecheck, lint, build sem erros.

## Contas e nuvem (2026-10-22, DEV; sem QA nem revisão visual ainda)
- Implementados no repositório: API de contas em `worker/` (Cloudflare Worker + D1: cadastro, login, logout, /me, PUT /baralho, /saude), tela real de Criar conta, tela provisória Conta (e-mail, contagens, SAIR), restauração de sessão via GET /me, `servicoAuthHttp` (usa `VITE_API_URL`; sem ela, "não configurado"). Baralho/coleção iniciais provisórios (40 cartas). Detalhes, riscos e passos do dono: `docs/CONTAS_E_NUVEM.md`.
- **Nada provisionado/publicado**: falta criar o D1, preencher `database_id` em `worker/wrangler.toml`, migrar, `worker:deploy`, definir variável `VITE_API_URL` no GitHub e fazer push. Enquanto isso o site publicado fica sem forma de jogar (convidado removido; jogar exige conta, que exige a API no ar).
- Pendências: verificação de e-mail e recuperação de senha (exigem provedor de e-mail), exclusão de conta, política de privacidade/LGPD (menores), recompensa de cartas no servidor, editor de baralho, decisão sobre baralho inicial (`REGRAS_DO_JOGO.md` §10 fala em liberar as 100 no protótipo).

- **Decisão pendente do dono**: `REGRAS_DO_JOGO.md` §10 (liberar as 100 cartas no protótipo) × coleção inicial = baralho inicial de 40 cartas (implementado conforme pedido). §10 não foi alterado.
- Correções pós-QA (2026-10-22): limites de login/cadastro atômicos e limite de login por IP (30/15 min); hash antes do 409; Bearer sem diferenciar caixa; barra final em /api/me/; e-mail NFKC + IDN recusado; aviso de reconexão; timeout 8 s. `npm test` 138/138.

## Diagnóstico e plano
- Diagnóstico, 12 inconsistências, arquitetura, plano de 8 etapas e papéis DEV/QA: `docs/PLANO_DE_DESENVOLVIMENTO.md`.
- Etapas 2–5 do plano (motor: baralho, turnos/combate, efeitos, IA) **implementadas, aguardando QA** (2026-10-22). Etapa 1 (tabuleiro) e a UI do duelo (fase B) ainda não iniciadas.

## Nuvem
- API de contas publicada em https://costa-clash-api.lucaspsimoes22.workers.dev (Cloudflare Worker + D1); site ligado via `VITE_API_URL`. Detalhes em `docs/CONTAS_E_NUVEM.md`.

## Funcionalidades concluídas
- Catálogo em `src/data/cartas.json` (cópia do `cartas.json` da raiz) com carregador `src/data/catalogo.ts`.
- Tipos e constantes do jogo em `src/game/tipos.ts`.
- Testes do catálogo (`src/game/__tests__/catalogo.test.ts`): 100 IDs/nomes únicos, 72/20/8 por tipo, atributos válidos, faixas de ID.

- Tela de login (`src/screens/login/`), componentes retrô reutilizáveis (`src/components/ui/`, `src/styles/`), validação pura e interface `ServicoAuth` (`src/auth/`), telas provisórias (criar conta, recuperar senha; convidado removido depois) e navegação por estado em `src/App.tsx`. NÃO há backend: o serviço padrão é "não configurado" e nunca autentica.
- Testes: `src/auth/__tests__/validacao.test.ts` e `src/screens/__tests__/login.test.tsx` (jsdom + Testing Library, ambiente por arquivo).

## Tarefa em andamento
- Nenhuma. Próxima: QA do motor e, depois, fase B (tela do duelo sobre `src/game/`).

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

## Arte das cartas (2026-10-23)
- Nenhuma ilustração final foi gerada. Preparação completa (guia, 100 sujeitos, prompts, manifesto, scripts, página `?arte=1`) e 5 provisórias recortadas da referência do dono (baixa resolução, ~1,2-1,4:1). Moldura de carta por categoria com selo e placa de nome implementada. Estados do manifesto: 95 pendente, 5 provisoria. Última verificação: `npm test` 608 + 1 ignorado, typecheck, lint, build, `arte:verificar` OK. Pendente: arte final (decisão/orçamento do dono) e revisão visual.

