# Arquitetura inicial (proposta)

- `src/game/`: tipos, estado, regras de fases, dano, efeitos e IA adversária; sem dependência de React.
- `src/data/`: definições de cartas com ids estáveis e explicações ambientais (`src/data/cartas.json`, cópia do `cartas.json` da raiz; o da raiz e o `cartas.csv` ficam como material de revisão).
- `src/components/`: tabuleiro, carta, mão, informações e ações.
- `src/game/__tests__/`: testes determinísticos do motor e casos de regressão.
- React + TypeScript + Vite; Vitest para testes quando inicializado. Primeiro apenas um duelo vs computador, sem servidor.
- Dados são locais; uma API de CETESB não é dependência do duelo e pode ser integrada em etapa separada, se aprovada.

Separar conteúdo educativo, motor de jogo e UI. Qualquer arquivo/stack aqui é proposta até a inicialização real do projeto.
