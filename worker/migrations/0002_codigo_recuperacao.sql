-- Costa Clash: código de recuperação de senha (sem e-mail). Migração ADITIVA: só acrescenta colunas anuláveis;
-- contas existentes continuam válidas (sem código até gerarem um em POST /api/conta/codigo-recuperacao).
-- Nunca se guarda o código em claro: só SHA-256 hex de "cc-recuperacao-v1|<salt>|<código normalizado>".
ALTER TABLE usuarios ADD COLUMN codigo_recuperacao_hash TEXT;        -- NULL = conta sem código
ALTER TABLE usuarios ADD COLUMN codigo_recuperacao_salt TEXT;        -- 16 bytes aleatórios, base64
ALTER TABLE usuarios ADD COLUMN codigo_recuperacao_criado_em INTEGER; -- epoch em ms
