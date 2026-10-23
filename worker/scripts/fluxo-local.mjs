// Smoke test manual contra `npm run worker:dev` (D1 local migrado). Uso: node worker/scripts/fluxo-local.mjs
const B = 'http://localhost:8787'
const O = { Origin: 'http://localhost:5173' }
const j = { 'Content-Type': 'application/json', ...O }
async function c(m, p, body, tok, extra = {}) {
  const t0 = Date.now()
  const r = await fetch(B + p, { method: m, headers: { ...(body ? j : O), ...(tok ? { Authorization: 'Bearer ' + tok } : {}), ...extra }, body: body ? JSON.stringify(body) : undefined })
  const txt = await r.text()
  return { s: r.status, t: Date.now() - t0, h: r.headers, txt, j: txt ? JSON.parse(txt) : null }
}
const log = (n, r, x = '') => console.log(n.padEnd(34), r.s, `${r.t}ms`, x)
const email = `Teste${Date.now()}@Exemplo.com`
let r = await c('POST', '/api/cadastro', { email, senha: 'senha-forte-1' })
log('cadastro', r, `${r.j.usuario.email} baralho=${r.j.usuario.baralho.length} colecao=${r.j.usuario.colecao.length} tok=${r.j.token.length}`)
const tok = r.j.token
const baralho = r.j.usuario.baralho
r = await c('POST', '/api/cadastro', { email: email.toLowerCase(), senha: 'senha-forte-1' }); log('cadastro duplicado', r, r.j.erro.mensagem)
r = await c('POST', '/api/cadastro', { email: 'x', senha: '1' }); log('cadastro invalido', r, JSON.stringify(r.j.erro.campos))
r = await c('GET', '/api/me', null, tok); log('me', r, `${r.j.usuario.email}`)
r = await c('GET', '/api/me'); log('me sem token', r)
r = await c('PUT', '/api/baralho', { cartas: [...baralho].reverse() }, tok); log('put baralho valido', r)
r = await c('PUT', '/api/baralho', { cartas: baralho.slice(1) }, tok); log('put 39 cartas', r, r.j.erro.mensagem)
r = await c('PUT', '/api/baralho', { cartas: [...baralho.slice(1), 'CC-999'] }, tok); log('put id desconhecido', r, r.j.erro.mensagem)
r = await c('PUT', '/api/baralho', { cartas: [...baralho.filter((i) => i !== 'CC-002'), 'CC-100'] }, tok); log('put alem da colecao', r, r.j.erro.mensagem)
r = await c('POST', '/api/login', { email, senha: 'senha-forte-1' }); log('login ok', r, `baralho[0]=${r.j.usuario.baralho[0]}`)
const tok2 = r.j.token
r = await c('POST', '/api/login', { email: 'naoexiste@x.com', senha: 'senha-forte-1' }); const a = r.txt; log('login email inexistente', r, r.j.erro.mensagem)
r = await c('POST', '/api/login', { email, senha: 'errada-errada' }); log('login senha errada', r, a === r.txt ? 'MESMA resposta' : 'DIFERENTE')
for (let i = 0; i < 4; i++) r = await c('POST', '/api/login', { email, senha: 'errada-errada' })
log('login 6a falha (limite)', r, r.j.erro.codigo)
r = await c('POST', '/api/login', { email, senha: 'senha-forte-1' }); log('login certo apos limite', r, r.j.erro?.codigo)
r = await c('POST', '/api/logout', null, tok); log('logout', r)
r = await c('GET', '/api/me', null, tok); log('me apos logout', r)
r = await c('GET', '/api/me', null, tok2); log('me outra sessao', r)
r = await c('OPTIONS', '/api/login', null, null, { 'Access-Control-Request-Method': 'POST' }); log('OPTIONS', r, r.h.get('access-control-allow-origin'))
r = await c('GET', '/api/saude', null, null, { Origin: 'https://evil.example' }); log('origem ruim', r)
r = await c('POST', '/api/login', { email, senha: 'x' }, null, { 'Content-Type': 'text/plain' }); log('content-type errado', r)

// Concorrencia: 30 logins errados em paralelo (so 5 devem chegar a verificar a senha) e 25 cadastros do mesmo IP.
const em2 = `par${Date.now()}@exemplo.com`
await c('POST', '/api/cadastro', { email: em2, senha: 'senha-forte-1' })
const par = await Promise.all(Array.from({ length: 30 }, () => c('POST', '/api/login', { email: em2, senha: 'errada-errada' })))
const cont = (arr, s) => arr.filter((x) => x.s === s).length
console.log('30 logins paralelos'.padEnd(34), `401=${cont(par, 401)} 429=${cont(par, 429)} (esperado 5/25)`)
const cads = await Promise.all(Array.from({ length: 25 }, (_, i) => c('POST', '/api/cadastro', { email: `lote${Date.now()}x${i}@exemplo.com`, senha: 'senha-forte-1' })))
console.log('25 cadastros paralelos'.padEnd(34), `201=${cont(cads, 201)} 429=${cont(cads, 429)} (IP ja consumiu alguns do script; esperado 201<=10)`)
