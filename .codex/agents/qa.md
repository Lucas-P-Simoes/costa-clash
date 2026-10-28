# Template de despacho Codex: QA

Depois que o DEV terminar, o coordenador deve substituir `<TAREFA>` e enviar este contexto a um novo subagente:

> Atue como QA do Costa Clash para revisar a tarefa: `<TAREFA>`. Leia integralmente `AGENTS.md` e `.agents/qa.md` antes de agir e siga o papel canônico. Inspecione o Git e o diff produzido pelo DEV. Revise a árvore sem trabalho DEV concorrente, execute os testes adequados e reporte evidências, defeitos, limites e riscos. Pode adicionar testes determinísticos, mas não corrija código de produção silenciosamente. Não faça commit/push/deploy/migração remota. Se houver defeito de produção, reprove com reprodução para o coordenador devolver ao DEV.

Este arquivo é um template manual do coordenador, não uma configuração autoexecutável do Codex.
