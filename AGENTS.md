# AGENTS.md — Costa Clash | regras compartilhadas Codex + Claude

## Princípio central
O mesmo repositório é usado alternadamente por OpenAI Codex e Claude Code. Nenhuma das ferramentas é a fonte da verdade: **o código, os testes, os documentos e o Git são**. Não pressuponha memória de outra sessão.

## Antes de qualquer tarefa
1. Ler `AGENTS.md`, `docs/REGRAS_DO_JOGO.md`, `docs/TESTING.md`, `docs/ARQUITETURA.md`, `docs/PLANO_DE_DESENVOLVIMENTO.md`, `docs/ESTADO_DO_PROJETO.md` e `docs/HANDOFF.md` (quando existirem).
2. Inspecionar `git status`, diffs pendentes, arquivos relevantes e scripts do `package.json`. Não sobrescrever alterações não relacionadas.
3. Identificar se a tarefa é **DEV** ou **QA**. Quando a tarefa envolver mudança de código, realizar DEV e depois QA (em sequência, nunca editando o mesmo arquivo simultaneamente).
4. Não inventar scripts ou comandos de teste; conferir `package.json`. Se o projeto ainda não existir, criar base mínima apenas quando solicitado.

## Papéis independentes do provedor
- **DEV:** implementar a menor mudança que atenda ao pedido, escrever testes relevantes, manter regras e interface separadas, usar TypeScript e funções puras para o motor.
- **QA:** analisar alterações e casos extremos, executar testes e build existentes, adicionar testes úteis sem alterar comportamento esperado. Se encontrar bug, reportar; correções de produção retornam ao DEV, depois novo QA.
- **Coordenador:** organizar DEV -> QA -> registro de continuidade; se a plataforma não disponibilizar subagentes, executar os papéis sequencialmente na sessão atual.

## Requisitos do jogo
- MVP para navegador: React + TypeScript + Vite, 1 jogador vs computador, **8.000 pontos de vida** por lado, **5 zonas de unidade + 5 zonas de suporte** por jogador e terreno global único, baralhos de **40 cartas** montados a partir do **catálogo de 100 cartas** (`cartas.json`, até 3 cópias por ID). Sem multiplayer, fusões ou backend inicialmente.
- Em caso de divergência entre este arquivo, o mockup (`Interface de Batalha Costa Clash.png`) e `docs/REGRAS_DO_JOGO.md`, vale `docs/REGRAS_DO_JOGO.md`. O mockup é referência visual, não de regras (ex.: ele mostra 4.000 de vida e 4 cartas na mão, valores superados).
- `docs/REGRAS_DO_JOGO.md` é referência para regras aprovadas/propostas; não mudar balanceamento ou condições de vitória silenciosamente.
- Toda explicação ambiental deve ser tecnicamente defensável; evitar afirmar que uma medida elimina totalmente determinado risco.

## Validação e qualidade
- Priorizar testes do motor de combate, turnos, habilidades, estados inválidos e IA básica; evitar testes frágeis de aparência/screenshot no MVP.
- Rodar testes relacionados e, antes de declarar concluído, suíte completa e build **se disponíveis**. Informar claramente comandos executados e falhas.
- Revisão visual/usabilidade fica com o responsável pelo projeto; nunca afirmar que foi realizada sem evidência.
- Não instalar pacotes grandes ou alterar stack sem necessidade e sem explicação.

## Troca entre ferramentas
- Ao terminar uma tarefa, atualizar `docs/ESTADO_DO_PROJETO.md` com progresso factual e `docs/HANDOFF.md` com alterações, arquivos, comandos/resultados, pendências, decisões e próximo passo.
- Atualizar `docs/REGRAS_DO_JOGO.md` e `docs/TESTING.md` quando houver mudanças relevantes.
- Usar Git em todos os marcos; commits apenas se autorizados. Não apagar arquivos, resetar ou descartar mudanças sem permissão.
- A ferramenta que retomar deve ler o handoff, confirmar o estado real por Git e testes, e só então continuar. O handoff não substitui conferência do código.

## Formato da resposta final
Resumo das mudanças; testes executados e resultados; problemas/pendências; arquivos relevantes; próximos passos. Indicar mudanças ainda não validadas visualmente.
