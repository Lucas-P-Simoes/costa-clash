import { describe, expect, it, vi } from 'vitest'
import { servicoAuthNaoConfigurado } from '../servicoAuth'
import { CHAVE_TOKEN, criarServicoAuthHttp } from '../servicoAuthHttp'
import { escolherServico } from '../servicoPadrao'

function memoria(inicial: Record<string, string> = {}) {
  const d = { ...inicial }
  return {
    d,
    getItem: (k: string) => d[k] ?? null,
    setItem: (k: string, v: string) => void (d[k] = v),
    removeItem: (k: string) => void delete d[k],
  }
}

const resp = (status: number, corpo?: unknown) =>
  new Response(corpo === undefined ? null : JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })

const usuario = { id: 'u1', email: 'a@b.co', baralho: ['CC-001'], colecao: [{ cartaId: 'CC-001', quantidade: 2 }] }

describe('escolherServico', () => {
  it('sem VITE_API_URL usa o serviço não configurado', () => {
    expect(escolherServico(undefined)).toBe(servicoAuthNaoConfigurado)
    expect(escolherServico('  ')).toBe(servicoAuthNaoConfigurado)
    expect(escolherServico('http://x')).not.toBe(servicoAuthNaoConfigurado)
  })
})

describe('servicoAuthHttp', () => {
  it('cadastrar: envia JSON, guarda só o token e devolve o perfil', async () => {
    const mem = memoria()
    const f = vi.fn().mockResolvedValue(resp(201, { token: 'TOKEN', usuario }))
    const s = criarServicoAuthHttp('https://api.x/', { fetch: f, armazenamento: mem })
    const r = await s.cadastrar!({ email: 'a@b.co', senha: 'segredo123' })
    expect(r).toEqual({ ok: true, usuario })
    expect(f.mock.calls[0]![0]).toBe('https://api.x/api/cadastro')
    expect(JSON.parse(f.mock.calls[0]![1].body)).toEqual({ email: 'a@b.co', senha: 'segredo123' })
    expect(mem.d).toEqual({ [CHAVE_TOKEN]: 'TOKEN' })
    expect(JSON.stringify(mem.d)).not.toContain('segredo123')
  })

  it('entrar: 401 vira credenciais_invalidas e não guarda token', async () => {
    const mem = memoria()
    const f = vi.fn().mockResolvedValue(resp(401, { erro: { codigo: 'credenciais_invalidas', mensagem: 'E-mail ou senha incorretos.' } }))
    const r = await criarServicoAuthHttp('https://api.x', { fetch: f, armazenamento: mem }).entrar({ email: 'a@b.co', senha: 'x' })
    expect(r).toMatchObject({ ok: false, codigo: 'credenciais_invalidas', mensagem: 'E-mail ou senha incorretos.' })
    expect(mem.d).toEqual({})
  })

  it('mapeia 409, 429 e erros de campo; falha de rede vira indisponível', async () => {
    const mk = (f: typeof fetch) => criarServicoAuthHttp('https://api.x', { fetch: f, armazenamento: memoria() })
    const dup = await mk(vi.fn().mockResolvedValue(resp(409, { erro: { mensagem: 'Este e-mail já está cadastrado.' } }))).cadastrar!({ email: 'a@b.co', senha: 'segredo123' })
    expect(dup).toMatchObject({ ok: false, codigo: 'email_em_uso' })
    const lim = await mk(vi.fn().mockResolvedValue(resp(429, { erro: { mensagem: 'Muitas tentativas.' } }))).entrar({ email: 'a@b.co', senha: 'x' })
    expect(lim).toMatchObject({ codigo: 'muitas_tentativas' })
    const campos = await mk(vi.fn().mockResolvedValue(resp(400, { erro: { mensagem: 'm', campos: { senha: 'curta' } } }))).cadastrar!({ email: 'a@b.co', senha: 'x' })
    expect(campos).toMatchObject({ codigo: 'dados_invalidos', campos: { senha: 'curta' } })
    const rede = await mk(vi.fn().mockRejectedValue(new TypeError('fail'))).entrar({ email: 'a@b.co', senha: 'x' })
    expect(rede).toMatchObject({ ok: false, codigo: 'indisponivel' })
  })

  it('restaurarSessao: usa Bearer; 401 remove o token; rede mantém', async () => {
    const mem = memoria({ [CHAVE_TOKEN]: 'TK' })
    const f = vi.fn().mockResolvedValueOnce(resp(200, { usuario })).mockResolvedValueOnce(resp(401, { erro: { mensagem: 'x' } }))
    const s = criarServicoAuthHttp('https://api.x', { fetch: f, armazenamento: mem })
    expect(s.temSessaoSalva!()).toBe(true)
    expect(await s.restaurarSessao!()).toEqual({ ok: true, usuario })
    expect(f.mock.calls[0]![1].headers.Authorization).toBe('Bearer TK')
    expect(await s.restaurarSessao!()).toMatchObject({ ok: false, codigo: 'sessao_invalida' })
    expect(mem.d).toEqual({})
    expect(s.temSessaoSalva!()).toBe(false)

    const mem2 = memoria({ [CHAVE_TOKEN]: 'TK' })
    const s2 = criarServicoAuthHttp('https://api.x', { fetch: vi.fn().mockRejectedValue(new Error('x')), armazenamento: mem2 })
    expect(await s2.restaurarSessao!()).toMatchObject({ codigo: 'indisponivel' })
    expect(mem2.d[CHAVE_TOKEN]).toBe('TK')
  })

  it('sair: remove o token mesmo se a rede falhar', async () => {
    const mem = memoria({ [CHAVE_TOKEN]: 'TK' })
    const f = vi.fn().mockRejectedValue(new Error('offline'))
    await criarServicoAuthHttp('https://api.x', { fetch: f, armazenamento: mem }).sair!()
    expect(mem.d).toEqual({})
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('salvarBaralho: PUT autenticado; 401 remove o token', async () => {
    const mem = memoria({ [CHAVE_TOKEN]: 'TK' })
    const f = vi.fn().mockResolvedValueOnce(resp(200, { baralho: ['CC-001'] })).mockResolvedValueOnce(resp(401, {}))
    const s = criarServicoAuthHttp('https://api.x', { fetch: f, armazenamento: mem })
    expect(await s.salvarBaralho!(['CC-001'])).toEqual({ ok: true, baralho: ['CC-001'] })
    expect(f.mock.calls[0]![1].method).toBe('PUT')
    expect(await s.salvarBaralho!(['CC-001'])).toMatchObject({ ok: false, codigo: 'sessao_invalida' })
    expect(mem.d).toEqual({})
  })

  it('iniciarDuelo / resgatarVitoria: POST autenticado e leitura do drop', async () => {
    const mem = memoria({ [CHAVE_TOKEN]: 'TK' })
    const colecao = [{ cartaId: 'CC-057', quantidade: 1 }, { cartaId: 7, quantidade: 1 }]
    const f = vi
      .fn()
      .mockResolvedValueOnce(resp(201, { dueloId: 'D1' }))
      .mockResolvedValueOnce(resp(200, { carta: 'CC-057', quantidade: 1, colecao }))
      .mockResolvedValueOnce(resp(200, { carta: null, quantidade: 0, colecao: [] }))
      .mockResolvedValueOnce(resp(409, { erro: { codigo: 'duelo_resgatado', mensagem: 'Já entregue.' } }))
      .mockResolvedValueOnce(resp(200, { carta: 5, quantidade: 1, colecao: [] }))
    const s = criarServicoAuthHttp('https://api.x', { fetch: f, armazenamento: mem })
    expect(await s.iniciarDuelo!('ressaca')).toEqual({ ok: true, dueloId: 'D1' })
    expect(f.mock.calls[0]![0]).toBe('https://api.x/api/duelo/iniciar')
    expect(f.mock.calls[0]![1].headers.Authorization).toBe('Bearer TK')
    expect(JSON.parse(f.mock.calls[0]![1].body)).toEqual({ oponenteId: 'ressaca' })
    expect(await s.resgatarVitoria!('D1')).toEqual({ ok: true, carta: 'CC-057', quantidade: 1, colecao: [{ cartaId: 'CC-057', quantidade: 1 }] })
    expect(f.mock.calls[1]![0]).toBe('https://api.x/api/duelo/vitoria')
    expect(JSON.parse(f.mock.calls[1]![1].body)).toEqual({ dueloId: 'D1' })
    expect(await s.resgatarVitoria!('D2')).toEqual({ ok: true, carta: null, quantidade: 0, colecao: [] })
    expect(await s.resgatarVitoria!('D1')).toMatchObject({ ok: false, mensagem: 'Já entregue.' })
    expect(await s.resgatarVitoria!('D3')).toMatchObject({ ok: false, codigo: 'indisponivel' })
  })

  it('iniciarDuelo / resgatarVitoria: sem token, 401 e falha de rede', async () => {
    expect(await criarServicoAuthHttp('https://api.x', { fetch: vi.fn(), armazenamento: memoria() }).iniciarDuelo!('ressaca')).toMatchObject({ ok: false, codigo: 'sessao_invalida' })
    const mem = memoria({ [CHAVE_TOKEN]: 'TK' })
    const f = vi.fn().mockRejectedValueOnce(new TypeError('rede')).mockResolvedValueOnce(resp(401, {}))
    const s = criarServicoAuthHttp('https://api.x', { fetch: f, armazenamento: mem })
    expect(await s.resgatarVitoria!('D1')).toMatchObject({ ok: false, codigo: 'indisponivel' })
    expect(mem.d).toEqual({ [CHAVE_TOKEN]: 'TK' })
    expect(await s.iniciarDuelo!('ressaca')).toMatchObject({ ok: false, codigo: 'sessao_invalida' })
    expect(mem.d).toEqual({})
  })

  it('armazenamento que lança (modo privado) não quebra nada', async () => {
    const bloqueado = () => {
      throw new Error('bloqueado')
    }
    const quebrado = { getItem: bloqueado, setItem: bloqueado, removeItem: bloqueado }
    const f = vi.fn().mockResolvedValue(resp(200, { token: 'TOKEN', usuario }))
    const s = criarServicoAuthHttp('https://api.x', { fetch: f, armazenamento: quebrado })
    expect(s.temSessaoSalva!()).toBe(false)
    expect((await s.entrar({ email: 'a@b.co', senha: 'x' })).ok).toBe(true)
    await expect(s.sair!()).resolves.toBeUndefined()
  })
})

describe('servicoAuthHttp: código de recuperação', () => {
  const COD = 'K7M2Q-9XWPD-4NHTR-VBS38'

  it('cadastrar devolve o código, que não vai para o armazenamento', async () => {
    const mem = memoria()
    const f = vi.fn().mockResolvedValue(resp(201, { token: 'TOKEN', usuario, codigoRecuperacao: COD }))
    const r = await criarServicoAuthHttp('https://api.x', { fetch: f, armazenamento: mem }).cadastrar!({ email: 'a@b.co', senha: 'segredo123' })
    expect(r).toEqual({ ok: true, usuario, codigoRecuperacao: COD })
    expect(JSON.stringify(mem.d)).not.toContain(COD)
  })

  it('recuperarSenha: sucesso devolve o novo código; 401 genérico vira credenciais_invalidas; não usa nem apaga o token', async () => {
    const mem = memoria({ [CHAVE_TOKEN]: 'TOKEN' })
    const f = vi
      .fn()
      .mockResolvedValueOnce(resp(200, { ok: true, codigoRecuperacao: COD }))
      .mockResolvedValueOnce(resp(401, { erro: { codigo: 'recuperacao_invalida', mensagem: 'E-mail ou código de recuperação inválidos.' } }))
      .mockResolvedValueOnce(resp(429, { erro: { codigo: 'muitas_tentativas', mensagem: 'Muitas tentativas.' } }))
    const s = criarServicoAuthHttp('https://api.x', { fetch: f, armazenamento: mem })
    const d = { email: 'a@b.co', codigo: 'k7m2q9xwpd4nhtrvbs38', novaSenha: 'nova-senha-2' }
    expect(await s.recuperarSenha!(d)).toEqual({ ok: true, codigoRecuperacao: COD })
    expect(f.mock.calls[0]![0]).toBe('https://api.x/api/senha/recuperar')
    expect(JSON.parse(f.mock.calls[0]![1].body)).toEqual(d)
    expect(f.mock.calls[0]![1].headers.Authorization).toBeUndefined()
    expect(await s.recuperarSenha!(d)).toMatchObject({ ok: false, codigo: 'credenciais_invalidas', mensagem: 'E-mail ou código de recuperação inválidos.' })
    expect(await s.recuperarSenha!(d)).toMatchObject({ ok: false, codigo: 'muitas_tentativas' })
    expect(mem.d[CHAVE_TOKEN]).toBe('TOKEN')
  })

  it('recuperarSenha: falha de rede é honesta', async () => {
    const s = criarServicoAuthHttp('https://api.x', { fetch: vi.fn().mockRejectedValue(new Error('rede')), armazenamento: memoria() })
    expect(await s.recuperarSenha!({ email: 'a@b.co', codigo: 'x', novaSenha: 'nova-senha-2' })).toMatchObject({ ok: false, codigo: 'indisponivel' })
  })

  it('gerarNovoCodigo: envia Bearer + senhaAtual; 403 = senha incorreta (mantém o token); 401 = sessão inválida (apaga o token)', async () => {
    const mem = memoria({ [CHAVE_TOKEN]: 'TOKEN' })
    const f = vi
      .fn()
      .mockResolvedValueOnce(resp(200, { codigoRecuperacao: COD }))
      .mockResolvedValueOnce(resp(403, { erro: { codigo: 'senha_incorreta', mensagem: 'Senha atual incorreta.' } }))
      .mockResolvedValueOnce(resp(401, { erro: { codigo: 'nao_autenticado', mensagem: 'x' } }))
    const s = criarServicoAuthHttp('https://api.x', { fetch: f, armazenamento: mem })
    expect(await s.gerarNovoCodigo!({ senhaAtual: 'senha-forte-1' })).toEqual({ ok: true, codigoRecuperacao: COD })
    expect(f.mock.calls[0]![1].headers.Authorization).toBe('Bearer TOKEN')
    expect(JSON.parse(f.mock.calls[0]![1].body)).toEqual({ senhaAtual: 'senha-forte-1' })
    expect(await s.gerarNovoCodigo!({ senhaAtual: 'x' })).toMatchObject({ ok: false, codigo: 'senha_incorreta' })
    expect(mem.d[CHAVE_TOKEN]).toBe('TOKEN')
    expect(await s.gerarNovoCodigo!({ senhaAtual: 'x' })).toMatchObject({ ok: false, codigo: 'sessao_invalida' })
    expect(mem.d[CHAVE_TOKEN]).toBeUndefined()
    expect(await s.gerarNovoCodigo!({ senhaAtual: 'x' })).toMatchObject({ ok: false, codigo: 'sessao_invalida' })
  })

  it('restaurarSessao lê temCodigoRecuperacao; serviço não configurado nunca simula sucesso', async () => {
    const f = vi.fn().mockResolvedValue(resp(200, { usuario: { ...usuario, temCodigoRecuperacao: true } }))
    const s = criarServicoAuthHttp('https://api.x', { fetch: f, armazenamento: memoria({ [CHAVE_TOKEN]: 'T' }) })
    expect(await s.restaurarSessao!()).toMatchObject({ ok: true, usuario: { temCodigoRecuperacao: true } })
    expect(await servicoAuthNaoConfigurado.recuperarSenha!({ email: 'a@b.co', codigo: 'x', novaSenha: 'y' })).toMatchObject({ ok: false, codigo: 'nao_configurado' })
    expect(await servicoAuthNaoConfigurado.gerarNovoCodigo!({ senhaAtual: 'x' })).toMatchObject({ ok: false, codigo: 'nao_configurado' })
  })
})
