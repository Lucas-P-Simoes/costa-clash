-- Costa Clash: duelos iniciados com conta, para o drop de cartas por vitória. Migração ADITIVA (tabela nova).
-- O duelo roda no navegador; o servidor não prova a vitória. Esta tabela LIMITA o abuso: cada duelo iniciado
-- rende no máximo um resgate, só depois de uma duração mínima, e o sorteio da carta acontece aqui no servidor.
CREATE TABLE duelos (
  id TEXT PRIMARY KEY,                 -- UUID aleatório devolvido ao cliente
  usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  oponente_id TEXT NOT NULL,
  iniciado_em INTEGER NOT NULL,        -- epoch em ms
  resgate TEXT                         -- NULL = vitória ainda não resgatada; senão nonce aleatório do resgate
);
CREATE INDEX idx_duelos_usuario ON duelos(usuario_id);
CREATE INDEX idx_duelos_iniciado ON duelos(iniciado_em);
