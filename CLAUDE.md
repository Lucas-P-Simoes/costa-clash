# CLAUDE.md — entrada do Claude Code

Leia e siga integralmente `AGENTS.md` como fonte compartilhada de regras com Codex. Leia `docs/REGRAS_DO_JOGO.md`, `docs/TESTING.md`, `docs/ARQUITETURA.md`, `docs/ESTADO_DO_PROJETO.md` e `docs/HANDOFF.md` antes de editar.

Use os subagentes `.claude/agents/dev.md` e `.claude/agents/qa.md` quando disponíveis. Sequência normal: DEV implementa e testa mudanças -> QA revisa e verifica regressões -> coordenador atualiza documentação de continuidade. Não execute modificações concorrentes nos mesmos arquivos.

Se subagentes não estiverem disponíveis, mantenha as duas responsabilidades separadas sequencialmente. Nunca assuma que uma conversa anterior no Codex está disponível: confira o repositório e o handoff.
