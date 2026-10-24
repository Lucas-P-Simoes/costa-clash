# Arquitetura inicial (proposta)

- `src/game/`: tipos, estado, regras de fases, dano, efeitos e IA adversária; sem dependência de React.
- `src/data/`: definições de cartas com ids estáveis e explicações ambientais (`src/data/cartas.json`, cópia do `cartas.json` da raiz; o da raiz e o `cartas.csv` ficam como material de revisão).
- `src/components/`: tabuleiro, carta, mão, informações e ações.
- `src/game/__tests__/`: testes determinísticos do motor e casos de regressão.
- `src/auth/` e `src/screens/{login,criarConta,conta}/`: contas no front (`ServicoAuth`, `servicoAuthHttp`, `servicoPadrao` escolhe por `VITE_API_URL`). `worker/`: API de contas (Cloudflare Worker + D1) em `worker/src/`, migração em `worker/migrations/`; reaproveita `src/data/cartas.json` e `src/auth/validacao.ts` por import relativo. Detalhes: `docs/CONTAS_E_NUVEM.md`. O duelo continua local e sem servidor; só conta, baralho e coleção vão à nuvem (servidor é a autoridade da coleção).
- React + TypeScript + Vite; Vitest para testes quando inicializado. Primeiro apenas um duelo vs computador, sem servidor.
- Dados são locais; uma API de CETESB não é dependência do duelo e pode ser integrada em etapa separada, se aprovada.

Separar conteúdo educativo, motor de jogo e UI. Qualquer arquivo/stack aqui é proposta até a inicialização real do projeto.

- Duelo Livre: dados em `src/data/oponentes.ts` (16 adversários; só apresentação, sem baralhos); retratos em `src/assets/oponentes/` (resolvidos por `import.meta.glob`); UI reutilizável em `src/components/ui/{GradeOponentes,navegacaoGrade,PainelOponente,MedidorDificuldade}` e tela em `src/screens/dueloLivre/`. `App.tsx` ganhou o estado `dueloLivre` (com `usuario` quando vem da Conta; sem, quando vem do Convidado).

## Motor de duelo (implementado, 2026-10-22; fase A, sem UI)
Módulos em `src/game/` (todos puros; sem React/DOM/localStorage/`Math.random`; estado imutável e serializável em JSON):
- `rng.ts` (mulberry32 + Fisher-Yates), `baralho.ts` (`validarBaralhoDuelo`), `estado.ts` (tipos, `criarEstadoInicial`, LP/destruição/fim de jogo, `invariantes`), `acoes.ts` (comandos e `aplicarComando`, início de turno, `jogadasLegais`/`ataquesLegais`), `combate.ts` (ATK/DEF efetivos, ataque), `efeitos.ts` (tabela por `operacao`), `armadilhas.ts` (elegibilidade, prioridade, gatilhos), `visao.ts` (`visaoParaJogador`: visão parcial, sem informação oculta), `ia.ts` (`decidirComando`), `duelo.ts` (`criarDuelo`, `executarTurnoIA`), `index.ts` (barrel da API pública).
- Dados: `src/data/baralhosOponentes.ts` (40 IDs para cada um dos 16 oponentes, provisórios), `src/data/baralhoInicial.ts` (movido de `worker/src/inicial.ts`, que agora só reexporta; saída da API idêntica).
- **Instâncias**: cada carta física tem `uid` (`h1..h40` do humano, `o1..o40` do oponente). Comandos referenciam cartas da mão por `uid` e unidades por **índice de zona** (0-4). Jogadores: `'humano'` (começa) e `'oponente'`.
- Todas as funções aceitam um `catalogo` opcional (padrão: `CATALOGO`).

### API pública (consumida pela UI na fase B)
```ts
criarDuelo({ baralhoJogador, baralhoOponente, seed, rng?, catalogo? })
  : { ok: true; estado; eventos } | { ok: false; erros: string[] }       // baralhos validados; humano em PRINCIPAL, turno 1
aplicarComando(estado, comando, catalogo?)
  : { ok: true; estado; eventos } | { ok: false; erro: string; estado }  // ilegal => MESMO objeto de estado, erro em português
executarTurnoIA(estado, seed?, catalogo?) : mesmo formato  // joga o turno inteiro do jogador ativo; eventos em ordem para animar
jogadasLegais(estado) : Comando[]     // jogadas da mão legais agora (ou os descartes possíveis se não houver jogada)
ataquesLegais(estado) : ComandoAtacar[]
visaoParaJogador(estado, 'humano' | 'oponente') : VisaoDuelo  // única fonte segura para renderizar a perspectiva do humano
atkEfetivo / defEfetiva(estado, dono, unidade, mapaCatalogo()) // valores a mostrar na carta (buffs, equipamento, terreno)
validarBaralhoDuelo(ids) : { ok: true } | { ok: false; erros: string[] }
```
Comandos (`Comando`, campo `jogador` obrigatório): `{tipo:'jogarCarta', uid, zona?, posicao?, alvo?}`, `{tipo:'mudarPosicao', zona, posicao}`, `{tipo:'descartar', uid}`, `{tipo:'avancarFase'}`, `{tipo:'encerrarTurno'}`, `{tipo:'atacar', atacante, alvo: zona | 'direto'}`, `{tipo:'desistir'}`.
Estado (`EstadoDuelo`): `jogadores[id] = {lp, baralho, mao, campo[5], suporte[5], descarte}`, `terreno`, `fase`, `ativo`, `turno` (absoluto, 1 = humano), `jogadaFeita`, `revelacao`, `resultado: {vencedor|null, motivo} | null`, `log`.
Eventos (`Evento` = dados + `turno` + `texto` em português): `turno_iniciado`, `compra`, `carta_jogada`, `descarte_forcado`, `posicao_alterada`, `efeito_aplicado`, `cura`, `dano`, `unidade_destruida`, `terreno_alterado`, `armadilhas_reveladas`, `armadilha_ativada`, `ataque_declarado`, `ataque_anulado`, `combate_resolvido`, `fase_alterada`, `turno_encerrado`, `desistencia`, `fim_de_jogo`, `ia_fallback`.
- **Atenção para a UI**: `estado` completo e `estado.log` contêm informação oculta (mão/baralho do oponente, cartas dos eventos `compra`). Renderizar sempre a partir de `visaoParaJogador(estado, 'humano')` e filtrar eventos do oponente (`compra`, `carta_jogada` de armadilha) antes de mostrar o `texto`. A dica educativa vem de `Carta.educacao` pelo `cartaId` do evento `carta_jogada`.
- Decisões de regra provisórias: `REGRAS_DO_JOGO.md` §15.
### Fase B: tela do duelo (UI)
- `src/screens/duelo/`: `TelaDuelo` (cria o duelo; seed no estado da tela; erros de baralho/adversário), `Partida` (estado do motor + seleção/modos guiados + reprodução do turno da IA), `ResultadoDuelo`, `duelo.css`. `src/components/duelo/`: `CartaView`/`CartaVerso`, `ArteCarta` (pixel art por grupo/tipo), `textoCarta` (efeito curto).
- Regra de ouro: a UI só chama `aplicarComando`/`executarTurnoIAComPassos` e renderiza `visaoParaJogador(estado,'humano')` + `logPublico`; `EstadoDuelo` completo e `log` crus nunca vão ao DOM. `App.tsx` tem a tela `duelo` (volta ao Duelo Livre mantendo o adversário e a sessão).
- API nova no motor: `logPublico(estado, jogador)`, `eventosPublicos(eventos, jogador)`, `executarTurnoIAComPassos(estado)` ({estado, eventos, passos[]}), evento `desistencia`.

### Redesenho visual do tabuleiro (2026-10-23)
- Apresentação refatorada sem tocar no motor nem nos fluxos de `Partida`. Componentes novos: `src/components/ui/MolduraOrnamentada.tsx` (+ `src/styles/moldura-ornamentada.css`; moldura de pedra reutilizável: borda texturizada, linha ciano pontilhada, 4 cantos espelhados, miolo escuro, aba opcional, tons ciano/ouro/vermelho/azul) e, em `src/components/duelo/`: `PainelJogador` (placa com avatar, VIDA, contagens, 5 zonas, faixa de 5 suportes), `BotaoAcao` (ATACAR/DEFENDER/USAR CARTA/ENCERRAR TURNO com ícone, subtítulo e motivo do bloqueio), `BannerTurno`, `FaixaTerreno`, `DicaEducativa`, `CabecalhoDuelo`, `iconesDuelo` (escudo, monitor, pessoa, lâmpada, setas, coração, ampulheta em pixel art) e `efeitosVisuais.ts` (função pura `derivarEfeitos` + hook `useEfeitosVisuais`).
- Animações: o hook observa o `logPublico` (eventos novos: `carta_jogada`, `ataque_declarado`, `dano`, `cura`, `unidade_destruida`, `turno_iniciado`) e devolve classes temporárias (`carta--fx-entrando|atacando|impacto|destruida`, `duelo-vida--dano|cura`, `duelo-turno--mudou`) por 600 ms (um timer, limpo ao desmontar). Carta destruída: um "fantasma" aria-hidden permanece na zona vazia até o fim da animação. `prefers-reduced-motion: reduce` => o hook não cria efeitos (e o CSS também zera as animações). Não bloqueiam entrada, não atrasam a IA e não alteram estado.
- Layout: desktop (>1100 px) `100dvh` em flex/grid (painéis proporcionais 1,25/1,25/1; cartas dimensionam pela altura); tablet e celular em coluna única com barra fixa de ações na base. Imagens em `src/assets/duelo/` (recortes de `Referencia-telas/`, origem em docs/HANDOFF.md).

## Arte das cartas (2026-10-23)
- `src/arte/`: dados e lógica puros (`sujeitos`, `prompts`, `categorias`, `manifesto`, `piloto`, `referencia`, `arteDisponivel`) e `indiceArte.json` (gerado do manifesto; decide em build se há ilustração). `scripts/arte/*.mjs`: E/S Node (manifesto, verificador, gerador com provedores plugáveis); importam os `.ts` por remoção de tipos (Node >= 22.18), por isso `src/arte` usa imports com extensão `.ts`. `public/assets/cards/art/`: manifest.json e imagens. UI: `CartaView` + `SeloCarta` (moldura/selo/placa), `src/Raiz.tsx` (rota `?arte=1`) e `src/screens/arte/`. Detalhes: `docs/ARTE_DAS_CARTAS.md`.

