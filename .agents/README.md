# Papéis compartilhados

Esta pasta contém as definições canônicas dos papéis do Costa Clash, independentes de provedor:

- `dev.md`: implementação e testes relacionados;
- `qa.md`: revisão separada, regressões e evidências.

Claude Code acessa esses papéis por adaptadores em `.claude/agents/`. Codex lê `AGENTS.md` e o coordenador usa os templates em `.codex/agents/` ao criar subagentes dinamicamente. Nenhum arquivo desta pasta inicia um agente por conta própria.

Alterações de responsabilidade devem ser feitas aqui primeiro. Adaptadores só indicam como carregar o papel canônico.
