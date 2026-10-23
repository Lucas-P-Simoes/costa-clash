-- Costa Clash: contas, sessões, coleção, baralho e limite de tentativas.
CREATE TABLE usuarios (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,          -- normalizado: trim + minúsculas
  senha_hash TEXT NOT NULL,            -- PBKDF2-SHA256, base64
  senha_salt TEXT NOT NULL,            -- 16 bytes aleatórios, base64
  iteracoes INTEGER NOT NULL,
  criado_em INTEGER NOT NULL           -- epoch em ms
);

CREATE TABLE sessoes (
  token_hash TEXT PRIMARY KEY,         -- SHA-256 hex do token (o token em si nunca é guardado)
  usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  criado_em INTEGER NOT NULL,
  expira_em INTEGER NOT NULL
);
CREATE INDEX idx_sessoes_usuario ON sessoes(usuario_id);
CREATE INDEX idx_sessoes_expira ON sessoes(expira_em);

-- Coleção: cartas com quantidade. Só o servidor escreve aqui.
CREATE TABLE colecao (
  usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  carta_id TEXT NOT NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  PRIMARY KEY (usuario_id, carta_id)
);

CREATE TABLE baralhos (
  usuario_id TEXT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  cartas_json TEXT NOT NULL,           -- JSON: array de 40 IDs
  atualizado_em INTEGER NOT NULL
);

-- Limite de tentativas (força bruta / criação em massa). chave = SHA-256 hex de escopo+dados.
CREATE TABLE tentativas_login (
  chave TEXT NOT NULL,
  janela INTEGER NOT NULL,             -- número da janela de tempo
  contagem INTEGER NOT NULL,
  PRIMARY KEY (chave, janela)
);
