/// <reference types="node" />
import { copyFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { criarPng } from './imagens'
import { CAMINHOS, PROVEDORES, executarGeracao, lerArgumentos, lerManifesto, obterProvedor, planejar, sincronizarPasta, verificarArte } from './scripts'

let dir: string
let caminhos: { dirArte: string; manifesto: string; indice: string; catalogo: string }
const listaReal = () => readdirSync(CAMINHOS.dirArte).sort()
let antes: string[]

beforeEach(() => {
  antes = listaReal()
  dir = mkdtempSync(join(tmpdir(), 'arte-gerar-'))
  caminhos = { dirArte: join(dir, 'art'), manifesto: join(dir, 'art', 'manifest.json'), indice: join(dir, 'indiceArte.json'), catalogo: CAMINHOS.catalogo }
  sincronizarPasta({ dirArte: caminhos.dirArte, manifestoPath: caminhos.manifesto, indicePath: caminhos.indice })
})
afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
  // Nenhum teste pode criar/alterar arquivos em public/assets/cards/art/.
  expect(listaReal()).toEqual(antes)
})

const png = (valor = 1) => criarPng(768, 1024, valor)
function provedorFalso(fazer: (prompt: string, n: number) => Uint8Array | Promise<Uint8Array> = (_p, n) => png(n)) {
  let n = 0
  return {
    id: 'falso',
    descricao: 'mock',
    variaveis: ['FALSO_KEY'],
    custoPorImagem: () => 0.04,
    gerar: vi.fn(async ({ prompt }: { prompt: string }) => ({ bytes: await fazer(prompt, ++n), modelo: 'm-falso' })),
  }
}
const env = { ARTE_PROVEDOR: 'falso', FALSO_KEY: 'k' }

describe('argumentos', () => {
  it('exige exatamente um seletor de lote e valida valores', () => {
    expect(lerArgumentos(['--lote', 'piloto'])).toMatchObject({ lote: 'piloto', executar: false, forcar: false })
    expect(lerArgumentos(['--ids', 'cc-001, CC-018'])).toMatchObject({ ids: ['CC-001', 'CC-018'] })
    expect(lerArgumentos(['--proximos', '10', '--executar', '--forcar'])).toMatchObject({ proximos: 10, executar: true, forcar: true })
    expect(() => lerArgumentos([])).toThrow(/exatamente um/)
    expect(() => lerArgumentos(['--lote', 'piloto', '--ids', 'CC-001'])).toThrow(/exatamente um/)
    expect(() => lerArgumentos(['--lote', 'x'])).toThrow(/Lote desconhecido/)
    expect(() => lerArgumentos(['--proximos', '0'])).toThrow()
    expect(() => lerArgumentos(['--ids', 'CC-001', '--bobagem'])).toThrow(/desconhecido/)
  })

  it('o provedor é escolhido por variável de ambiente e é extensível', () => {
    expect(obterProvedor('openai').id).toBe('openai')
    expect(() => obterProvedor(undefined)).toThrow(/ARTE_PROVEDOR/)
    expect(() => obterProvedor('nada')).toThrow(/desconhecido/)
    expect(obterProvedor('falso', { ...PROVEDORES, falso: provedorFalso() }).id).toBe('falso')
  })
})

describe('dry-run (padrão)', () => {
  it('lote piloto imprime os prompts e a quantidade sem chamar a API nem criar arquivos', async () => {
    const saida: string[] = []
    const fetchEspiao = vi.fn()
    const r = await executarGeracao({ argv: ['--lote', 'piloto'], env: {}, log: (s: string) => saida.push(s), caminhos, fetch: fetchEspiao })
    expect(fetchEspiao).not.toHaveBeenCalled()
    expect(r.modo).toBe('dry-run')
    expect(r.selecionadas).toEqual(['CC-001', 'CC-018', 'CC-047', 'CC-031', 'CC-073'])
    expect(r.geradas).toEqual([])
    expect(r.chamadas).toBe(0)
    const txt = saida.join('\n')
    expect(txt).toMatch(/Quantidade: 5 imagem/)
    expect(txt).toMatch(/Sem texto, sem moldura, sem ATK\/DEF, sem logotipo\./)
    expect(txt).toMatch(/custo estimado: desconhecido/i)
    expect(txt).toMatch(/nenhuma API foi chamada/)
    expect(readdirSync(caminhos.dirArte)).toEqual(['manifest.json'])
  })

  it('mostra custo quando o provedor informa preço e --proximos escolhe as primeiras pendentes', async () => {
    const saida: string[] = []
    const r = await executarGeracao({ argv: ['--proximos', '3'], env, log: (s: string) => saida.push(s), caminhos, provedores: { falso: provedorFalso() } })
    expect(r.selecionadas).toEqual(['CC-001', 'CC-002', 'CC-003'])
    expect(saida.join('\n')).toMatch(/US\$ 0\.12/)
  })

  it('o dry-run vale mesmo com chaves configuradas (sem --executar não chama o provedor)', async () => {
    const p = provedorFalso()
    await executarGeracao({ argv: ['--ids', 'CC-001'], env, log: () => {}, caminhos, provedores: { falso: p } })
    expect(p.gerar).not.toHaveBeenCalled()
  })
})

describe('--executar com provedor FALSO (mock)', () => {
  it('gera apenas pendentes, grava NNN.png, atualiza o manifesto para gerada com sha256/bytes/dimensões', async () => {
    const p = provedorFalso()
    const r = await executarGeracao({ argv: ['--ids', 'CC-001,CC-018', '--executar'], env, log: () => {}, caminhos, provedores: { falso: p } })
    expect(r.geradas).toEqual(['CC-001', 'CC-018'])
    expect(p.gerar).toHaveBeenCalledTimes(2)
    expect(p.gerar.mock.calls[0][0].prompt).toMatch(/Sem texto, sem moldura/)
    expect(readdirSync(caminhos.dirArte).sort()).toEqual(['001.png', '018.png', 'manifest.json'])
    const m = lerManifesto(caminhos.manifesto)
    const e1 = m.entradas.find((e: { id: string }) => e.id === 'CC-001')
    expect(e1).toMatchObject({ estado: 'gerada', arquivo: '001.png', promptHashGerado: e1.promptHash, origem: 'gerada via falso (m-falso)' })
    expect(e1.verificacao).toMatchObject({ largura: 768, altura: 1024 })
    expect(e1.verificacao.sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(e1.verificacao.bytes).toBeGreaterThan(100)
    expect(JSON.parse(readFileSync(caminhos.indice, 'utf8'))).toMatchObject({ 'CC-001': { estado: 'gerada' }, 'CC-018': { estado: 'gerada' } })
    expect(verificarArte({ diretorio: caminhos.dirArte, manifesto: lerManifesto(caminhos.manifesto) })).toMatchObject({ ok: true, erros: [] })
  })

  it('não regenera arquivo existente sem --forcar; com --forcar regenera', async () => {
    const p = provedorFalso()
    await executarGeracao({ argv: ['--ids', 'CC-001', '--executar'], env, log: () => {}, caminhos, provedores: { falso: p } })
    const primeiro = readFileSync(join(caminhos.dirArte, '001.png'))
    const r2 = await executarGeracao({ argv: ['--ids', 'CC-001', '--executar'], env, log: () => {}, caminhos, provedores: { falso: p } })
    expect(r2.geradas).toEqual([])
    expect(r2.puladas[0].motivo).toMatch(/--forcar/)
    expect(p.gerar).toHaveBeenCalledTimes(1)
    const r3 = await executarGeracao({ argv: ['--ids', 'CC-001', '--executar', '--forcar'], env, log: () => {}, caminhos, provedores: { falso: p } })
    expect(r3.geradas).toEqual(['CC-001'])
    expect(readFileSync(join(caminhos.dirArte, '001.png')).equals(primeiro)).toBe(false)
  })

  it('nunca regenera arte aprovada, nem com --forcar', async () => {
    const p = provedorFalso()
    await executarGeracao({ argv: ['--ids', 'CC-001', '--executar'], env, log: () => {}, caminhos, provedores: { falso: p } })
    const m = lerManifesto(caminhos.manifesto)
    m.entradas[0].estado = 'aprovada'
    writeFileSync(caminhos.manifesto, JSON.stringify(m))
    const antesArq = readFileSync(join(caminhos.dirArte, '001.png'))
    const r = await executarGeracao({ argv: ['--ids', 'CC-001', '--executar', '--forcar'], env, log: () => {}, caminhos, provedores: { falso: p } })
    expect(r.geradas).toEqual([])
    expect(r.puladas[0].motivo).toMatch(/APROVADA/)
    expect(p.gerar).toHaveBeenCalledTimes(1)
    expect(readFileSync(join(caminhos.dirArte, '001.png')).equals(antesArq)).toBe(true)
    expect(lerManifesto(caminhos.manifesto).entradas[0].estado).toBe('aprovada')
  })

  it('provisória só é substituída com --forcar (vira gerada, nunca aprovada)', async () => {
    copyFileSync(join(CAMINHOS.dirArte, '001.png'), join(dir, 'art', '001.png'))
    sincronizarPasta({ dirArte: caminhos.dirArte, manifestoPath: caminhos.manifesto, indicePath: caminhos.indice, ajustes: (m: { entradas: { estado: string }[] }) => void (m.entradas[0].estado = 'provisoria') })
    const p = provedorFalso()
    const sem = await executarGeracao({ argv: ['--ids', 'CC-001', '--executar'], env, log: () => {}, caminhos, provedores: { falso: p } })
    expect(sem.puladas[0].motivo).toMatch(/provisoria/)
    expect(p.gerar).not.toHaveBeenCalled()
  })

  it('recusa e não salva imagem fora de 3:4, ilegível ou pequena; registra falha', async () => {
    const respostas = [criarPng(1024, 1536), Buffer.from('lixo'), criarPng(300, 400), png(9)]
    const p = provedorFalso((_x, n) => respostas[n - 1])
    const r = await executarGeracao({ argv: ['--ids', 'CC-001,CC-002,CC-003,CC-004', '--executar'], env, log: () => {}, caminhos, provedores: { falso: p } })
    expect(r.geradas).toEqual(['CC-004'])
    expect(r.falhas.map((f: { id: string }) => f.id)).toEqual(['CC-001', 'CC-002', 'CC-003'])
    expect(r.falhas[0].erro).toMatch(/não é 3:4/)
    expect(r.falhas[2].erro).toMatch(/abaixo do mínimo/)
    expect(readdirSync(caminhos.dirArte).sort()).toEqual(['004.png', 'manifest.json'])
  })

  it('falha do provedor (exceção) é registrada sem derrubar o lote', async () => {
    const p = provedorFalso(() => {
      throw new Error('HTTP 500')
    })
    const r = await executarGeracao({ argv: ['--ids', 'CC-001', '--executar'], env, log: () => {}, caminhos, provedores: { falso: p } })
    expect(r.falhas[0]).toEqual({ id: 'CC-001', erro: 'HTTP 500' })
    expect(existsSync(join(caminhos.dirArte, '001.png'))).toBe(false)
  })

  it('exige as variáveis do provedor e o ARTE_PROVEDOR', async () => {
    await expect(executarGeracao({ argv: ['--ids', 'CC-001', '--executar'], env: { ARTE_PROVEDOR: 'falso' }, log: () => {}, caminhos, provedores: { falso: provedorFalso() } })).rejects.toThrow(/FALSO_KEY/)
    await expect(executarGeracao({ argv: ['--ids', 'CC-001', '--executar'], env: {}, log: () => {}, caminhos })).rejects.toThrow(/ARTE_PROVEDOR/)
  })

  it('ID inexistente é pulado', async () => {
    const r = await executarGeracao({ argv: ['--ids', 'CC-999'], env: {}, log: () => {}, caminhos })
    expect(r.puladas[0]).toMatchObject({ id: 'CC-999' })
  })
})

describe('planejar', () => {
  it('--proximos ignora provisórias/geradas e escolhe só pendentes', () => {
    const m = lerManifesto(caminhos.manifesto)
    m.entradas[0].estado = 'provisoria'
    m.entradas[1].estado = 'gerada'
    const { gerar } = planejar({ manifesto: m, opcoes: { proximos: 2, forcar: false }, dirArte: caminhos.dirArte })
    expect(gerar.map((e: { id: string }) => e.id)).toEqual(['CC-003', 'CC-004'])
  })
})
