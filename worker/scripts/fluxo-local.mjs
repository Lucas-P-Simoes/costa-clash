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
const codigo1 = r.j.codigoRecuperacao
console.log('codigo no cadastro'.padEnd(34), /^[A-HJ-KM-NP-Z2-9]{5}(-[A-HJ-KM-NP-Z2-9]{5}){3}$/.test(codigo1) ? 'formato OK' : 'FORMATO INVALIDO', 'temCodigo=' + r.j.usuario.temCodigoRecuperacao)
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

// ----- recuperacao de senha por codigo -----
const mail = `rec${Date.now()}@exemplo.com`
r = await c('POST', '/api/cadastro', { email: mail, senha: 'senha-forte-1' }); const cod = r.j.codigoRecuperacao; const tokRec = r.j.token
r = await c('GET', '/api/me', null, tokRec); log('me nao repete o codigo', r, `temCodigo=${r.j.usuario.temCodigoRecuperacao} vazou=${r.txt.includes(cod)}`)
r = await c('POST', '/api/senha/recuperar', { email: 'naoexiste@x.com', codigo: cod, novaSenha: 'nova-senha-2' }); const g1 = r.txt; log('recuperar email inexistente', r, r.j.erro.mensagem)
r = await c('POST', '/api/senha/recuperar', { email: mail, codigo: 'ABCDE-FGHJK-MNPQR-STUVW', novaSenha: 'nova-senha-2' }); log('recuperar codigo errado', r, g1 === r.txt ? 'MESMA resposta' : 'DIFERENTE')
r = await c('POST', '/api/senha/recuperar', { email: mail, codigo: cod, novaSenha: 'curta' }); log('recuperar senha invalida', r, r.j.erro.mensagem)
r = await c('POST', '/api/senha/recuperar', { email: ' ' + mail.toUpperCase() + ' ', codigo: cod.toLowerCase().replaceAll('-', ' '), novaSenha: 'nova-senha-2' }); log('recuperar ok (normalizado)', r, `novoCodigo=${/^.{5}-.{5}-.{5}-.{5}$/.test(r.j.codigoRecuperacao ?? '')}`)
const cod2 = r.j.codigoRecuperacao
r = await c('GET', '/api/me', null, tokRec); log('sessao antiga invalidada', r)
r = await c('POST', '/api/login', { email: mail, senha: 'senha-forte-1' }); log('login senha antiga', r)
r = await c('POST', '/api/login', { email: mail, senha: 'nova-senha-2' }); log('login senha nova', r); const tokNovo = r.j.token
r = await c('POST', '/api/senha/recuperar', { email: mail, codigo: cod, novaSenha: 'outra-senha-3' }); log('codigo antigo recusado', r)
r = await c('POST', '/api/conta/codigo-recuperacao', { senhaAtual: 'errada-errada' }, tokNovo); log('novo codigo senha errada', r, r.j.erro.codigo)
r = await c('POST', '/api/conta/codigo-recuperacao', { senhaAtual: 'nova-senha-2' }, tokNovo); log('novo codigo senha certa', r, `ok=${!!r.j.codigoRecuperacao}`); const cod3 = r.j.codigoRecuperacao
r = await c('POST', '/api/senha/recuperar', { email: mail, codigo: cod2, novaSenha: 'outra-senha-3' }); log('codigo intermediario recusado', r)
r = await c('POST', '/api/senha/recuperar', { email: mail, codigo: cod3, novaSenha: 'outra-senha-3' }); log('ultimo codigo funciona', r)
r = await c('OPTIONS', '/api/senha/recuperar', null, null, { 'Access-Control-Request-Method': 'POST' }); log('OPTIONS recuperar', r, r.h.get('access-control-allow-origin'))
r = await c('POST', '/api/senha/recuperar', { email: mail, codigo: cod3, novaSenha: 'x' }, null, { Origin: 'https://evil.example' }); log('recuperar origem ruim', r)
const alvo = `alvo${Date.now()}@exemplo.com`
await c('POST', '/api/cadastro', { email: alvo, senha: 'senha-forte-1' })
const rec = await Promise.all(Array.from({ length: 12 }, () => c('POST', '/api/senha/recuperar', { email: alvo, codigo: 'ABCDE-FGHJK-MNPQR-STUVW', novaSenha: 'nova-senha-2' })))
console.log('12 recuperacoes paralelas'.padEnd(34), `401=${rec.filter((x) => x.s === 401).length} 429=${rec.filter((x) => x.s === 429).length} (esperado 5/7)`)

// Concorrencia: 30 logins errados em paralelo (so 5 devem chegar a verificar a senha) e 25 cadastros do mesmo IP.
const em2 = `par${Date.now()}@exemplo.com`
await c('POST', '/api/cadastro', { email: em2, senha: 'senha-forte-1' })
const par = await Promise.all(Array.from({ length: 30 }, () => c('POST', '/api/login', { email: em2, senha: 'errada-errada' })))
const cont = (arr, s) => arr.filter((x) => x.s === s).length
console.log('30 logins paralelos'.padEnd(34), `401=${cont(par, 401)} 429=${cont(par, 429)} (esperado 5/25)`)
const cads = await Promise.all(Array.from({ length: 25 }, (_, i) => c('POST', '/api/cadastro', { email: `lote${Date.now()}x${i}@exemplo.com`, senha: 'senha-forte-1' })))
console.log('25 cadastros paralelos'.padEnd(34), `201=${cont(cads, 201)} 429=${cont(cads, 429)} (IP ja consumiu alguns do script; esperado 201<=10)`)
