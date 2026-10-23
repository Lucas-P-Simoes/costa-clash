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
