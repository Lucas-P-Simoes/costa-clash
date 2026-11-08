# Costa Clash — REGRAS_DO_JOGO.md
**Versão 1.0 | 22/10/2026 | Fonte única para Claude Code e Codex**

> **Status:** regulamento de implementação proposto, aprovado apenas quando incorporado pelo responsável ao projeto. O jogo é uma **adaptação simplificada inspirada em Yu-Gi-Oh! Forbidden Memories**, sem reproduzir cartas, personagens, imagens ou marcas do jogo original. Atributos são números de jogo, **não medidas científicas**.

## 1. Objetivo e aprendizagem
Duelo educativo sobre interação costa-mar: ocupação, ecossistemas, fauna, atividades humanas, impactos, saneamento e planejamento. Habilidades e textos informativos representam relações ambientais plausíveis e contextualizadas, não previsões universais. Ensinar por cartas, explicações curtas e desafio pós-duelo opcional.

## 2. Configuração
- Um humano × oponente computadorizado; duelo local em site responsivo, sem conta obrigatória nem multiplayer.
- **5.000 LP** por lado (alterado de 8.000 a pedido do dono do projeto); baralhos de **40 cartas** (montagem/perfil), dos quais só **30 entram em cada duelo** (embaralha e usa as 30 primeiras; alterado a pedido do dono); **até 3 cópias do mesmo ID**; embaralhar baralhos com RNG injetável nos testes.
- **Catálogo de 70 cartas distintas** (`CC-101…CC-170`, todas unidades), mas cada baralho de duelo tem 40, selecionadas dentre as 70 (duplicatas permitidas até 3). O catálogo não é um baralho de 70 cartas. As 72 cartas anteriores `CC-001…CC-072` foram removidas em 08/11/2026 a pedido do responsável; cartas de ação e suporte já haviam sido removidas (§16 e §17).
- Campo: **5 zonas de unidades** por jogador (sem zonas de suporte e, desde §17, sem terreno global). Sem fusão, invocação-tributo, estrelas guardiãs, rituais nem multiplayer no MVP.
- **Mão inicial de cinco**: ambos compram 5 antes do primeiro turno. Primeiro a agir: humano (fixo no MVP). Sem mulligan.
- **Exceção do tutorial (08/11/2026, a confirmar com o dono):** só no duelo 1 (Guardião do Mangue, guiado) os baralhos entram em ordem fixa (sem embaralhar), o Guardião começa com **2.000 LP** em vez de 5.000 e a IA dele nunca ataca. "Pular tutorial" volta às regras normais. Ver `src/data/tutorialGuardiao.ts`.
- Nenhum custo de mana, energia, nível ou tributo. Uma jogada da mão por turno. Não pode baixar mais de uma carta por turno.

## 3. Compra e fim por deck
- No início de cada turno, inclusive o primeiro, **complete a mão até 5**. Como já recebeu cinco cartas na abertura, o primeiro jogador não compra extra no turno 1.
- Se houver menos cartas no baralho do que o necessário para completar a mão, **perca imediatamente por falha na compra obrigatória**. Para implementação determinística, cheque suficiência **antes de comprar** e declare derrota sem compra parcial.
- Caso a mão esteja com cinco cartas, não há obrigação de comprar e não ocorre derrota por deck vazio naquele instante. A derrota ocorre quando faltar carta numa reposição efetivamente exigida.
- Sem reembaralhar descarte. Sem limite artificial de turnos. É obrigatório realizar **exatamente uma jogada da mão** por turno enquanto uma jogada legal existir. Se não houver jogada legal, permitir descartar uma carta como jogada do turno; não bloquear partida por campo cheio (adaptação explícita).

## 4. Turnos e comandos
1. `INICIO`: checar resultado, comprar até 5, zerar flags de ataque das próprias unidades e encerrar buffs temporários expirados.
2. `PRINCIPAL`: realizar uma jogada da mão (unidade ou ação); depois pode ajustar posição das unidades que não atacaram. Se for necessário, descartar uma carta conta como jogada.
3. `COMBATE`: atacar com quaisquer unidades suas em ATQ, até **uma vez por unidade**. Unidade invocada neste turno **pode atacar** se não for o primeiro turno absoluto da partida.
4. `FIM`: processar fim de turno e passar ao adversário.
- **No primeiro turno absoluto, o humano não pode atacar**. O oponente pode atacar no segundo turno absoluto. A ordem do combate não depende da ordem de invocação.
- Cada unidade ocupa posição `ATAQUE` ou `DEFESA`; só ataca em ATAQUE. Posição pode mudar livremente antes do ataque; uma unidade que atacou não pode mudar posição até o próximo turno de seu controlador.
- Na interface, uma unidade em `DEFESA` é representada com a carta deitada (rotação de 90°), tanto no campo humano quanto no campo da IA; em `ATAQUE`, permanece em pé. Essa orientação é pública e independe de a carta estar virada para cima ou para baixo.
- Ao colocar uma unidade no campo, seu controlador escolhe a posição (`ATAQUE` ou `DEFESA`) e se ela fica **virada para cima ou para baixo**. Unidade virada para baixo pode existir também em ATAQUE e pode mudar de posição sem ser revelada.
- Para o adversário, uma unidade virada para baixo oculta identidade, ilustração, ATK e DEF, mas sua zona ocupada e sua posição continuam públicas. O controlador continua conhecendo sua própria carta.
- Sem efeitos de reação em cadeia: não há cartas que reajam a jogadas ou ataques do adversário.
- Jogadas ilegais não modificam estado. Todas as transições são validadas no motor, não só pela interface.

## 5. Cálculo de combate
- `ATK_EFETIVO = max(0, ATK_BASE + buffs_ATK + bonus_terreno)`; `DEF_EFETIVA = max(0, DEF_BASE + buffs_DEF + bonus_terreno)`.
- Contra unidade em ATAQUE: maior ATK destrói a menor; perdedor recebe diferença em LP. Empate destrói ambas, sem dano.
- Contra unidade em DEFESA: ATK maior que DEF destrói defensora sem dano de LP; ATK menor que DEF causa ao atacante dano de LP igual à diferença, **sem destruir unidades**; empate não destrói e não causa dano.
- Unidade virada para baixo pode atacar e ser escolhida como alvo de ataque. Imediatamente antes do cálculo, toda unidade virada para baixo envolvida naquele combate é revelada permanentemente; em ATAQUE usa seu ATK e em DEFESA usa sua DEF pelas regras acima.
- Sem unidade adversária em campo, permite ataque direto: subtrai ATK_EFETIVO dos LP adversários.
- Destruídas vão para descarte. Sem dano por transbordamento contra DEFESA.
- LP ≤ 0 determina derrota imediata. Se um efeito simultâneo levar ambos a ≤ 0, declarar empate (regra adaptada para casos não presentes no catálogo).

## 6. Tipos e efeitos (MVP determinístico)
> **Histórico:** desde 05/11/2026 (§17) só existem cartas `unidade`; os itens abaixo sobre ações, terrenos, buffs e cura descrevem o desenho anterior e não estão mais implementados.
- `unidade`: apenas ATK/DEF; **não possui habilidade ativada automática** na v1.0. `grupo` é um de `ecossistema`, `fauna`, `atividade`, `impacto` e determina alvos e bônus.
- `acao/instantanea`: jogada no turno, resolve, vai para descarte. Se não houver alvo válido para efeito direcionado, não pode jogar essa ação; curas podem ser jogadas se LP abaixo de 5.000. Não permitir cura acima de 5.000.
- `acao/terreno`: substitui imediatamente o terreno global, descartando o anterior. Bônus se aplicam **a ambos os jogadores** às unidades do grupo indicado, tanto ATK quanto DEF, enquanto o terreno existir.
- `buff_grupo` e `debuff_grupo`: exigem escolher **uma única unidade** válida (aliada para buff, inimiga para debuff). Modificam **ATK e DEF** pela quantidade indicada e duram enquanto a unidade estiver no campo. Não atingem todas as unidades do grupo.
- `buff_unidade`: selecionar qualquer unidade **aliada**, soma o valor ao **ATK e DEF** até sair do campo.
- `destruir_grupo`: destruir **uma unidade inimiga** do grupo especificado; não afeta LP.
- Uma unidade inimiga virada para baixo não pode ser oferecida como alvo de ação direcionada cuja elegibilidade dependa de grupo/identidade ocultos. Isso evita usar a validação da interface ou da IA para descobrir a carta; ataques continuam podendo escolhê-la normalmente.
- Buffs que o controlador aplicar à própria unidade oculta são mantidos no estado real. A carta de ação jogada continua pública, mas a visão da unidade e o evento público do efeito não expõem identidade, atributos acumulados, operação, valor nem texto derivado do alvo antes da revelação.
- `cura`: acrescentar LP ao próprio controlador até o máximo de 5.000.
- `field_bonus`: aplica bônus ao ATK e à DEF de todas as unidades elegíveis dos dois lados.
- Efeitos **não são cumulativos com a mesma carta física**, mas múltiplas cartas distintas podem acumular modificadores. A ordem de resolução é: validação → alterações de atributo/dano → descarte → checagem da vitória.
- `Fiscalização Ambiental` requer grupo alvo `impacto`, a carta não é uma remoção global. `Tratamento de Esgoto` tem como alvo **uma unidade impacto**, não necessariamente somente esgoto. A categorização é mecânica abstrata, não alegação científica de que um tratamento remova todos os impactos.

## 7. Timing e desempates
- Validar alvo ao declarar a ação; se alvo sumir antes de resolver, resolver sem efeito e enviar ação instantânea ao descarte (não deve acontecer no fluxo síncrono MVP).
- Não há cartas de reação (armadilhas) nem de suporte: o único estado persistente fora das unidades é o terreno global.

## 8. Finalização e educação
- Vitória por LP do oponente em 0 ou por falha de reposição obrigatória da mão; derrota inversa; permitir desistência explícita.
- Sem limite máximo de turnos. Se ocorrer estado sem possibilidade de avanço, detectar repetição exata de estado 3 vezes e encerrar como empate técnico (**salvaguarda de software, não regra de Forbidden Memories**).
- Exibir dica educativa de cada carta ao ser jogada, sem interromper duelo (botão `Saiba mais` opcional). No encerramento, mostrar até 3 conceitos e 1 questão opcional sem bloquear recompensa.
- Os números de ataque/defesa são ficcionais; nunca afirmar que um impacto é objetivamente mais forte, perigoso ou benéfico por causa desses valores.

## 9. IA simples (sem IA generativa)
- Selecionar jogada legal determinística: priorizar unidade capaz de vencer combate, depois ação eficaz, depois unidade de maior defesa, depois ação pouco eficaz; desempate por ID crescente.
- Posicionar em ATQ se houver vantagem atual; senão DEFESA. Atacar quando gera dano favorável ou vence unidade; nunca atacar unidade em defesa mais alta quando gera dano ao próprio LP, a menos que não haja outras opções e se queira evitar empate por estagnação.
- Ao jogar uma unidade, a política determinística da IA combina posição e face: com vantagem atual, entra em `ATAQUE` virada para cima; sem vantagem, entra em `DEFESA` virada para baixo. Uma troca posterior de posição não revela automaticamente a unidade.
- Oponentes avançados diferem pelos baralhos, não por vantagem ilegal de regras. Não acessar mão ou ordem futura do deck humano na estratégia.
- A IA recebe unidades adversárias viradas para baixo apenas como marcadores de zona/posição, sem identidade nem atributos. Política determinística mínima: prefere primeiro qualquer combate favorável conhecido; se não existir, pode atacar um alvo oculto com seu atacante disponível de maior ATK, usando a menor zona como desempate. Essa escolha assume risco e nunca consulta o conteúdo oculto.

## 10. Catálogo, progressão e baralhos
- Os **70 modelos de cartas** estão no arquivo `cartas.json`, que é a **fonte de dados estruturada**. Todos são originais.
- O catálogo ativo contém somente `CC-101…CC-170`: 70 unidades de fauna importadas da planilha do responsável, com classificação, ambiente e característica informativos. Os IDs `CC-001…CC-100` não fazem parte do jogo atual.
- O editor de baralho seleciona exatamente 40 instâncias, com máximo 3 cópias de cada ID. Inicialmente liberar todas as 70 no modo protótipo; desbloqueio por vitória pode ser implementado depois sem bloquear QA.
- **Coleção e drop de cartas (implementado, percentuais PROVISÓRIOS):** a conta começa com a coleção inicial (= baralho inicial) e cresce por vitórias no Duelo Livre. Cada vitória com conta rende **uma carta** sorteada no servidor da tabela do adversário vencido (`src/data/dropsOponentes.ts`). Os 17 baralhos têm exatamente 40 cartas e no máximo 3 cópias por ID. As 70 cartas são distribuídas por afinidade entre o ambiente informado e os oponentes, com rodízio que garante ao menos uma aparição de cada ID; a dificuldade prioriza faixas de força diferentes. Cada adversário dropa exatamente os IDs distintos do próprio baralho; cada tabela soma 100% e, juntas, cobrem as 70 cartas. O peso provisório é 4 quando ATK+DEF < 3000, 2 entre 3000 e 4499 e 1 a partir de 4500; cada ID recebe ao menos 1%, e o restante é normalizado por maior resto para fechar 100%. A coleção guarda no máximo **3 cópias por carta**; cartas no teto saem do sorteio e as chances restantes se renormalizam. Derrota, empate e jogo sem conta não rendem carta.
- Não confundir **70 cartas únicas disponíveis** com baralho de 40 unidades. Oferecer baralhos iniciais prontos com 40 cartas válidas.
- Balanceamento é provisório, sujeito a simulação de partidas e feedback humano. Cartas de alto ATK não têm custos especiais no estilo adotado; IA precisa garantir diversão, não igualdade de poder matematicamente garantida.

## 11. Catálogo completo (70 cartas)
As cartas ativas são exclusivamente CC-101…CC-170. Seus nomes, atributos e metadados informativos ficam em cartas.json e src/data/cartas.json, fontes estruturadas canônicas. Todas são unidades de fauna; CC-153 (CRISTA-DE-GALO) tem ATK 500 e DEF 500.

## 12. Critérios de aceite DEV e QA
- `cartas.json` possui **exatamente 70 IDs únicos (`CC-101…CC-170`)**, todos unidades; nomes únicos; stats inteiros não negativos; todas possuem classificação, ambiente e característica informativos.
- Baralho inválido (≠ 40 cartas, >3 de mesmo ID ou IDs desconhecidos) é rejeitado antes do duelo.
- Testes de reposição da mão, perda por compra incompleta, primeiro turno sem ataque, ataque pós-invocação, escolha de posições, cálculo de dano, empate, terreno afetando ambos e buffs persistentes.
- Testes de mão/campo cheios, descarte forçado como jogada legal, evitar vazamento do estado oculto da IA, determinismo do RNG, clamping de LP/atributos e efeitos sem alvos.
- QA roda lint, typecheck, unitários e teste mínimo de integração antes de considerar mudança finalizada. Revisão visual da interface é humana.
- Ambos Claude Code e Codex devem consultar este documento, `cartas.json`, `AGENTS.md`, `CLAUDE.md` e atualizar `docs/HANDOFF.md` ao finalizar sessão, se esses arquivos existirem.

## 13. Diferenças conscientes de Forbidden Memories
O jogo de referência inclui fusões, estrelas guardiãs, posições especiais e outras interações que **não** fazem parte do MVP. Esta versão define regra explícita de descarte para campo cheio, regra para detecção de estagnação e efeitos educativos próprios, sem afirmar que sejam mecânicas originais de Forbidden Memories.

## 14. Referências para as mecânicas de inspiração
- https://ftp.yugipedia.com/wiki/Yu-Gi-Oh%21_True_Duel_Monsters%3A_Sealed_Memories
- https://yugioh.fandom.com/wiki/Yu-Gi-Oh%21_Forbidden_Memories_Gameplay
- https://yugiohpro.com.br/guide/como-duelar.php

## 15. Decisões de implementação (provisórias)
> Registradas pelo DEV em 2026-10-22 ao implementar o motor (`src/game/`). Resolvem ambiguidades do texto **sem alterar balanceamento nem regras aprovadas**; aguardam confirmação do responsável. Os itens marcados **[DECISÃO DO DONO]** são os mais relevantes.

**Valores e sinais**
1. **Sinal dos valores do catálogo** é normalizado por operação (o sinal do JSON não é usado): `debuff_grupo` sempre **reduz** `|valor|` (no JSON é negativo); `buff_grupo`/`buff_unidade` sempre **aumentam** `|valor|`; `field_bonus` usa o valor como está.
2. **Buffs/debuffs** são guardados "brutos" na unidade (ATK e DEF) e só o resultado é limitado: `ATK_EFETIVO = max(0, base + buffs + terreno)` (idem DEF). Um buff posterior compensa um debuff anterior. LP nunca fica abaixo de 0 (dano limitado ao que resta) nem acima de 5.000 (cura parcial permitida).
3. **Buffs temporários não existem no MVP** (nenhuma carta os tem): a etapa "encerrar buffs temporários" do `INICIO` não faz nada além de zerar as flags de ataque.

**Fluxo de turno**
4. O estado só "repousa" em `PRINCIPAL` ou `COMBATE`; `INICIO` e `FIM` são processados dentro dos comandos (eventos `turno_iniciado`, `compra`, `turno_encerrado`). `criarDuelo` já devolve o turno 1 do humano em `PRINCIPAL`.
5. `avancarFase` (PRINCIPAL -> COMBATE) e `encerrarTurno` exigem que a jogada da mão (ou o descarte forçado) já tenha sido feita; só há exceção se a mão estiver vazia (estado atípico, para nunca travar). Ataques só na fase `COMBATE`. No turno absoluto 1 o jogador pode avançar/encerrar, mas `atacar` é recusado.
6. **Descarte**: há a **lixeira** (descarte livre): na fase principal do próprio turno, qualquer carta da mão pode ser descartada, quantas vezes o jogador quiser, sem gastar a jogada da mão (a UI oferece arrastar a carta até a lixeira, no painel lateral que substituiu a Dica Educativa, ou um botão para a carta selecionada). A mão é reposta até 5 no início do **próximo turno do próprio jogador** (se faltar carta no baralho para repor, a regra de derrota por compra incompleta se aplica). O descarte **forçado** (sem nenhuma jogada de carta legal e jogada da mão ainda não feita) continua existindo e conta como a jogada do turno.
7. **Mudança de posição**: permitida nas fases `PRINCIPAL` e `COMBATE`, a qualquer momento (inclusive antes da jogada da mão e logo após invocar), para unidades que ainda não atacaram no turno, sem limite de trocas. Posição padrão ao invocar, se não informada: `ATAQUE`.
8. **Escolha de zona**: o comando pode informar a zona (de unidade); omitida = primeira zona livre; zona ocupada é recusada. Alvos de efeitos são sempre escolhidos explicitamente (índice da zona da unidade); alvo omitido ou inválido é recusado (nunca há escolha automática).
9. **Reposição**: no início de cada turno, se faltarem cartas no baralho para completar a mão, o jogador perde (`motivo: compra`) **sem compra parcial**. O jogador que abre a partida não compra no turno 1; o oponente também não compra no turno 2 (mão já completa).

**Efeitos**
10. **Ordem de resolução (§6)** implementada: validação -> alterações de atributo/dano -> descarte -> checagem de vitória. Em combate, a unidade oculta é revelada antes do cálculo; o dano é aplicado antes da destruição; a vitória é checada ao final.
11. *(Itens 11–14 e 16 — armadilhas, `revelar` e equipamento — foram removidos junto com essas cartas; ver §16.)*
15. **Terreno**: pertence a quem o jogou (`dono`); ao ser substituído vai ao descarte do dono; jogar o mesmo terreno de novo é permitido. O bônus é calculado dinamicamente (não é gravado nas unidades), vale para os dois lados, e `alvo: 'qualquer'` atinge todos os grupos.
17. **Cura** só é jogável se LP < 5.000; terrenos não têm condição de alvo.
18. **Desistência**: qualquer jogador, a qualquer momento (não precisa ser o turno), enquanto a partida não terminou.

**Salvaguardas**
19. **Repetição 3x (§8)**: assinatura do estado (LP, mãos como multiconjunto de IDs, campo, tamanhos de baralho/descarte, terreno, jogador ativo; sem log, uids nem número de turno) registrada no início de cada turno após a reposição; 3 ocorrências = empate (`motivo: repeticao`). Na prática é inalcançável, pois o baralho encolhe a cada turno (confirmado por teste e pelas simulações).
20. **Empate duplo** (ambos LP <= 0) é inalcançável pelo catálogo atual (cada evento retira LP de só um lado); a regra está implementada e testada com estado construído.

**IA (§9) — definições concretas**
21. **IA agressiva** (a pedido do dono): a IA fica em `ATAQUE` sempre que vence ao menos um combate (não exige mais superar todos os atacantes inimigos), pesa menos a perda do atacante e o dano próprio, e ataca se a melhor opção tiver pontuação ≥ `limiarAtaque` (-1000, isto é, aceita trocas equivalentes e pequenos custos); ataques suicidas (atacante destruído sem compensação) continuam evitados.
21b. "Capaz de vencer combate" = ATK efetivo (com bônus de terreno) maior que o valor defensivo (ATK se a unidade inimiga está em ataque, DEF se está em defesa) de ao menos uma unidade inimiga, ou campo inimigo vazio. "Vantagem atual" (posição de ataque) = vence algum combate **e** o ATK não é menor que o de nenhum atacante inimigo. Ao baixar uma unidade, vantagem atual escolhe ATAQUE para cima; sem vantagem escolhe DEFESA para baixo. Ordem de jogada: (0) unidade que vence (maior ATK); (1) ação eficaz (peso: destruir > debuff > buff > terreno > cura; alvo de maior ATK); (2) unidade de maior DEF; (4) ações pouco eficazes (cura que não recupera o valor inteiro, terreno que não favorece). Desempate: ID crescente, depois uid e zona. Sem jogada legal, descarta a carta de menor soma ATK+DEF (ações valem mais). Ataque: direto se não há unidades inimigas; senão só ataques favoráveis (ATK maior que o ATK da unidade em ataque ou que a DEF da unidade em defesa), preferindo remover a unidade de maior ATK; nunca ataca quando haveria dano ao próprio LP, empate de destruição ou nada. A exceção "evitar estagnação" **não** foi implementada (o baralho finito já encerra toda partida).
22. A IA só recebe `VisaoDuelo` (sem mão/baralho do adversário, sem identidade das unidades viradas para baixo, sem log). `executarTurnoIA` aceita um `seed` opcional **reservado** (a IA é totalmente determinística e hoje não o usa).

## 16. Remoção das cartas de suporte (05/11/2026, a pedido do dono)
- **Pedido:** "remova as cartas suporte do baralho e da referência do campo, mantenha as demais cartas". Removidas as 5 zonas de suporte do campo e as 12 cartas que as usavam: equipamentos `CC-085…CC-088` e armadilhas `CC-093…CC-100`.
- **Decisão adicional (a confirmar com o dono):** `CC-082` *Estudo de Impacto* (`revelar`) também saiu, porque seu único efeito era revelar armadilhas inimigas e ela ficaria sem função. Total removido: 13 cartas; restam **87** (72 unidades, 11 ações instantâneas, 4 terrenos). As artes das cartas removidas ficam arquivadas em `docs/arte/cartas-removidas/` e os dados, no histórico do Git.
- **IDs não renumerados** (artes, histórias e coleções existentes continuam válidos). O catálogo passou a ter lacunas de ID.
- **Motor:** `ZONAS_SUPORTE`, `SuporteEmZona`, `armadilhas.ts`, equipamentos, `revelar`, `revelacao`/`proximaOrdem` do estado, eventos `armadilha_ativada`/`armadilhas_reveladas`/`ataque_anulado` e a faixa SUPORTES da interface foram removidos. Combate, turnos, terreno, buffs, cura, unidade virada para baixo e IA permanecem.
- **Baralhos (balanceamento — mudança documentada):** cada cópia removida foi reposta por uma cópia extra de uma unidade já presente no **mesmo** baralho, em rodadas pela ordem de listagem das unidades, até o teto de 3 por ID (sem cartas novas). Os 17 adversários continuam com 40 cartas, mas agora têm de 4 a 8 ações. O baralho inicial (e a coleção inicial de contas novas) passou de 26 unidades + 10 ações + 4 armadilhas para 32 unidades + 8 ações (+1 cópia em CC-001, 002, 003, 004, 005 e 017).
- **Drops:** tabelas recalculadas pela mesma regra de pesos (4/2/1, maior resto) sem as cartas removidas.
- **Contas existentes:** baralhos/coleções salvos que contenham IDs removidos deixam de ser válidos. A interface ignora esses IDs na coleção/editor e o Duelo usa o baralho inicial se o salvo tiver ID desconhecido; o servidor (D1) **não foi migrado** (ver `docs/HANDOFF.md`).

## 17. Remoção das cartas de ação (05/11/2026, a pedido do dono)
- **Pedido:** "remova as cartas de ação do baralho também". Removidas as 15 cartas `acao` restantes — instantâneas `CC-073…081`, `CC-083`, `CC-084` e terrenos `CC-089…092` (**interpretação:** "ação" = `tipo: acao` do catálogo, o que inclui terrenos; a confirmar com o dono). Catálogo final: **72 cartas, todas unidades** (`CC-001…CC-072`).
- **Motor/UI:** `efeitos.ts` e `efeitos.test.ts`/`qa_efeitos.test.ts` removidos; sem terreno global (`FaixaTerreno`, `bonusTerreno`, `estado.terreno`), sem buffs/debuffs por cartas, sem cura, sem alvos de ação nem arrasto de ação. A mão só tem unidades; permanecem unidade virada para baixo, ataque por seta, lixeira (descarte), IA e a cena de confronto. Os campos `buffAtk`/`buffDef` das unidades continuam no estado (sempre 0) para não alterar o formato.
- **Baralhos (balanceamento — mudança documentada):** cópias removidas repostas por cópias extras de unidades do próprio baralho (ordem de listagem, teto 3); quando o baralho saturou (todas as unidades dele já a 3 cópias), entrou a próxima unidade (ID crescente) do grupo majoritário do baralho que ainda não estava nele (1 cópia por rodada). Todos os 17 baralhos e o inicial têm 40 unidades. O baralho inicial é só unidades (coleção inicial = ele). Drops recalculados pela mesma regra 4/2/1 (raridade pelo ranking ATK+DEF das unidades, que reproduz os rótulos anteriores); como entraram unidades novas em alguns baralhos, as tabelas desses adversários ganharam essas cartas.
- **Arte:** 15 artes arquivadas em `docs/arte/cartas-removidas/`; lote piloto passou de 5 para 4 cartas (saiu `CC-073`).
- **Contas existentes:** igual ao §16 — IDs removidos na coleção/baralho salvos são ignorados pela UI e o duelo usa o baralho inicial; o D1 não foi migrado.
