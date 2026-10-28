# Templates de subagentes do Codex

O Codex reconhece `AGENTS.md` como instrução do repositório. Os arquivos desta pasta **não são auto-descobertos nem iniciam agentes sozinhos**: são templates que a sessão coordenadora deve usar ao criar subagentes dinamicamente.

Fluxo:

1. o coordenador lê `AGENTS.md` e registra o estado inicial;
2. cria um subagente com `dev.md` e aguarda seu término;
3. cria um novo subagente com `qa.md` sobre a árvore resultante;
4. defeitos voltam a uma nova rodada DEV e depois a uma nova rodada QA;
5. o coordenador consolida `docs/ESTADO_DO_PROJETO.md` e `docs/HANDOFF.md`.

Nunca despachar DEV e QA ao mesmo tempo na mesma árvore de trabalho.
