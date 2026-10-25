# Contas e nuvem — Costa Clash

Estado: implementado e testado localmente (2026-10-22, DEV). **Nada foi provisionado na Cloudflare** e nenhum deploy foi feito; os passos do dono estão na seção 7.

## 1. Arquitetura
- **Front** (GitHub Pages, `https://lucas-p-simoes.github.io/costa-clash/`): React/Vite. Fala com a API via `VITE_API_URL`. Sem a variável, o serviço padrão é `servicoAuthNaoConfigurado` (nunca simula sucesso; sem a variável não é possível entrar nem jogar: o modo convidado foi removido).
- **API**: Cloudflare Worker em `worker/` (TypeScript) + banco **D1** (binding `DB`). Roteamento manual em `worker/src/app.ts`, rotas em `rotas.ts`, SQL em `dados.ts`, criptografia em `cripto.ts`, limite de tentativas em `limite.ts`, CORS/cabeçalhos/corpo em `http.ts`.
- **Reuso sem duplicar**: o worker importa `src/data/cartas.json` (catálogo) e `src/auth/validacao.ts` (mesmas regras de e-mail/senha do front) por import relativo; o bundler do wrangler resolve (verificado com `wrangler dev --local`).
- **Servidor é a autoridade da coleção**: não existe endpoint que aumente a coleção. A coleção só é escrita no cadastro (coleção inicial). A futura recompensa por derrotar oponente será uma rota própria no servidor (não implementada).

## 2. Endpoints (JSON, prefixo `/api`)
| Método e rota | Auth | Corpo | Resposta |
|---|---|---|---|
| `GET /saude` | não | — | `200 {ok:true}` |
| `POST /cadastro` | não | `{email, senha}` | `201 {token, usuario}`; `400` validação (com `erro.campos`); `409` e-mail em uso; `429` limite |
| `POST /login` | não | `{email, senha}` | `200 {token, usuario}`; `401` mensagem única; `429` limite |
| `POST /logout` | Bearer | — | `204` (idempotente; invalida só o token enviado) |
| `GET /me` | Bearer | — | `200 {usuario}`; `401` |
| `PUT /baralho` | Bearer | `{cartas: string[40]}` | `200 {baralho}`; `400 baralho_invalido`; `401` |

`usuario = {id, email, baralho: string[], colecao: [{cartaId, quantidade}]}`. Erros: `{erro:{codigo, mensagem, campos?}}` em português. Outros: `404`, `405` (com `Allow`), `413`, `415`, `403` (Origin não permitida), `500` genérico.

Regras do `PUT /baralho`: exatamente 40 cartas, máx. 3 cópias por ID, IDs existentes no catálogo e quantidade por ID ≤ coleção do usuário (`worker/src/baralho.ts`, função pura).

## 3. Modelo de dados (`worker/migrations/0001_init.sql`)
- `usuarios(id, email UNIQUE normalizado, senha_hash, senha_salt, iteracoes, criado_em)`
- `sessoes(token_hash PK, usuario_id, criado_em, expira_em)` — só o SHA-256 do token.
- `colecao(usuario_id, carta_id, quantidade>0)` PK composta.
- `baralhos(usuario_id PK, cartas_json, atualizado_em)`
- `tentativas_login(chave, janela, contagem)` — `chave` = SHA-256 de escopo+dados (e-mail e IP não ficam em texto claro).
Chaves estrangeiras com `ON DELETE CASCADE`. O cadastro grava usuário, coleção, baralho e sessão num único `db.batch` (transação).

## 4. Baralho/coleção inicial (DECISÃO PROVISÓRIA)
`worker/src/inicial.ts`: 40 cartas, ≤3 por ID: 26 unidades (7 ecossistema CC-001/002/003/004/005, 7 fauna, 7 atividade, 5 impacto), 10 ações (6 instantâneas, 2 equipamentos, 2 terrenos) e 4 armadilhas (CC-093..096). A coleção inicial é exatamente essas 40 cartas (33 IDs). Escolha de balanceamento/progressão é do responsável; mudar o arquivo só afeta contas criadas depois (contas existentes não são migradas). As demais cartas do catálogo ficam para recompensas futuras. **Conflito de regra a decidir**: `REGRAS_DO_JOGO.md` §10 diz "inicialmente liberar todas as 100 no modo protótipo"; o pedido atual define coleção inicial = baralho inicial (progressão). Mantida a versão do pedido.

## 5. Segurança implementada
- Senha: PBKDF2-SHA256, **100000 iterações** (máximo do runtime Workers), salt de 16 bytes por usuário, comparação em tempo constante; iterações guardadas por usuário (permite migrar). Para e-mail inexistente roda-se um hash fictício (igualar tempo). Senha 8–128 caracteres; nunca devolvida nem logada; o worker não faz nenhum `console.log`.
- Sessão: token aleatório de 256 bits (base64url), guardado só como SHA-256; expira em 30 dias; `Authorization: Bearer`. Sem cookies (sem CSRF).
- Login: mesma resposta (`401`, "E-mail ou senha incorretos.") para e-mail inexistente, senha errada e entradas absurdas. **Limites reais** (janela fixa; contador incrementado ANTES de decidir, com `INSERT ... ON CONFLICT DO UPDATE ... RETURNING contagem`, atômico sob requisições paralelas): login 5 tentativas por e-mail+IP em 15 min e 30 por IP em 15 min (contra password spraying); depois `429`. Login com sucesso apaga o contador do e-mail e devolve a tentativa ao contador do IP. Cadastro: 10 por IP/hora. Verificado com 30 logins e 25 cadastros paralelos (Promise.all em teste e script contra `wrangler dev`).
- Cadastro: o hash da senha é calculado antes de responder `409`, para diminuir a diferença de tempo entre e-mail novo e já usado (não elimina; o `409` explícito continua enumerável, mitigado pelo limite por IP).
- E-mail: normalização `NFKC` + trim + minúsculas (mesma função `normalizarEmail` no front e no worker); domínios não ASCII (IDN) são recusados por enquanto.
- Autenticação: `Authorization: Bearer <token>` (esquema sem diferenciar maiúsculas/minúsculas); `/api/me/` com barra final é aceito.
- CORS: `ORIGENS_PERMITIDAS` (var em `wrangler.toml`, separadas por vírgula; padrão GitHub Pages + `http://localhost:5173`). Origin não listada recebe `403` (inclusive OPTIONS); sem Origin (curl) funciona sem cabeçalhos CORS.
- Entrada: `Content-Type: application/json` obrigatório, corpo ≤ 8 KB (lido em streaming com teto), e-mail ≤ 254, senha 8–128. SQL só parametrizado (`bind`).
- Respostas: `Cache-Control: no-store`, `X-Content-Type-Options`, `Referrer-Policy: no-referrer`, CSP restritiva, HSTS.
- Front: token em `localStorage` com try/catch; removido no logout e em 401; senha nunca armazenada; `credentials: 'omit'`; timeout de 15 s nas chamadas.

## 6. Riscos e limitações conhecidos
- **Sem verificação de e-mail**: qualquer pessoa pode cadastrar e-mail alheio (cria conta "squatting"; também impede o dono real de usar esse e-mail). Requer provedor de e-mail.
- **Sem recuperação de senha**: senha esquecida = conta perdida. A tela segue como placeholder honesto. Requer provedor de e-mail (ex.: MailChannels/Resend) e fluxo com token de uso único.
- **Token em localStorage**: um XSS no front rouba a sessão. Mitigações atuais: sem HTML dinâmico/`dangerouslySetInnerHTML`, dependências mínimas. Alternativa futura: cookie HttpOnly (exige mesmo site/domínio próprio).
- **R1 — CPU do Workers (validar logo após o deploy)**: PBKDF2 com 100000 iterações pode exceder o limite de CPU do plano gratuito (10 ms por requisição, no plano gratuito), resultando em erro 1102 em cadastro/login. Nada disso foi medido em produção. Teste logo após o deploy (cadastro + login reais). Contingência: reduzir `ITERACOES_PBKDF2` em `worker/src/cripto.ts` (contas existentes continuam válidas, pois as iterações ficam gravadas por usuário) ou migrar para o plano pago do Workers.
- **Reconexão**: se a sessão salva não puder ser restaurada por falha de rede, o login mostra "Não foi possível reconectar à sua conta; tente novamente." e o token é mantido; 401 remove o token. Timeout do cliente: 8 s.
- **Limite de tentativas por janela fixa** em D1: permite rajada na virada de janela; IP vem de `CF-Connecting-IP` (atrás de NAT compartilhado pode afetar vários usuários); um atacante só bloqueia um e-mail alvo no próprio IP (a chave inclui o IP). Não há CAPTCHA nem limite global por e-mail entre IPs (um atacante com muitos IPs pode tentar a mesma conta; a mitigação é a senha mínima de 8 caracteres). Considerar Cloudflare Rate Limiting/Turnstile.
- PBKDF2 a 100000 iterações é inferior às recomendações atuais (OWASP: 600000) por limite do runtime; mitigado por limite de tentativas e exigência de 8 caracteres. Sem checagem de senhas vazadas nem requisitos de complexidade.
- **LGPD / menores**: o jogo é educativo e pode atrair menores de 18 anos. Guarda-se e-mail (dado pessoal) e hash. Faltam política de privacidade, termos, base legal/consentimento (consentimento de responsável para menores de 12 anos, Art. 14), canal de exclusão de conta e retenção definida. **Não há endpoint de exclusão de conta** (pendência). Revisão jurídica recomendada antes de divulgar.
- Sessões vencidas e janelas de tentativas antigas são limpas oportunisticamente (sem cron); logout não encerra outras sessões; sem "sair de todos os dispositivos".
- Sem `CF-Connecting-IP` (execução local) o IP vira `desconhecido`: todos compartilham um balde de limite.
- O cadastro responde `409` para e-mail já usado (por pedido): permite enumerar e-mails cadastrados (mitigado só pelo limite de 10 cadastros/h por IP).

## 7. Provisionamento (passos do dono; nada disso foi feito)
Pré-requisito: conta Cloudflare e Node instalado; `npm ci`.
1. `npx wrangler login`
2. `npx wrangler d1 create costa-clash` → copie o `database_id` impresso.
3. Edite `worker/wrangler.toml`: troque o `database_id` placeholder (`00000000-...`, marcado com `TODO(DONO)`).
4. `npm run worker:migrar:remoto` (aplica `migrations/0001_init.sql`).
5. Confirme `ORIGENS_PERMITIDAS` em `worker/wrangler.toml` (inclua domínio próprio se houver; `http://localhost:5173` pode ser removido em produção).
6. `npm run worker:deploy` → anote a URL (`https://costa-clash-api.<subdominio>.workers.dev`). Teste: `curl <URL>/api/saude`.
7. No GitHub: Settings → Secrets and variables → Actions → **Variables** → nova variável de repositório `VITE_API_URL` = URL do worker (sem barra final). Não é segredo. O workflow `deploy.yml` já a repassa ao `npm run build`.
8. Push na `main` para republicar o front.

Desenvolvimento local: `npm run worker:migrar:local` → `npm run worker:dev` (porta 8787, D1 local em `worker/.wrangler/`, ignorado pelo Git) e, em outro terminal, `cp .env.example .env.local` + `npm run dev`.

## 8. Testes
- `worker/src/__tests__/` (Vitest, ambiente node): `cripto`, `baralho` (inclui baralho inicial) e `api` (fluxo completo via `tratar()` sobre SQLite em memória `node:sqlite` com a migração real aplicada; relógio injetável). `@cloudflare/vitest-pool-workers` **não foi tentado** (evitou-se dependência extra e risco de incompatibilidade com Vitest 5/Windows); em troca o fluxo foi validado também com `wrangler dev --local` (workerd real + D1 local) por script (ver `docs/TESTING.md`).
- Front: `src/auth/__tests__/{cadastro,servicoAuthHttp}.test.ts`, `src/screens/__tests__/conta.test.tsx`.
- Não validado: deploy real, D1 remoto, CORS com navegador real contra o Worker publicado, `CF-Connecting-IP` real, limites de CPU do Workers com PBKDF2 (100000 it. cabem no plano gratuito normalmente, mas não foi medido em produção; local: ~60-150 ms por hash).
