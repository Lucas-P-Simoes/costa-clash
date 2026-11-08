/// <reference types="node" />
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CATALOGO } from '../../data/catalogo'
import { sincronizarManifesto } from '../manifesto'
import type { Manifesto } from '../manifesto'
import { promptDaCarta } from '../prompts'
import { criarPng, criarWebp } from './imagens'
import { formatarRelatorio, lerInfoImagem, sha256, verificarArte } from './scripts'

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'arte-verificar-'))
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

const cartas = CATALOGO.map((c) => ({ id: c.id, nome: c.nome, prompt: promptDaCarta(c).prompt, promptHash: sha256(promptDaCarta(c).prompt) }))
const manifestoVazio = (): Manifesto => sincronizarManifesto({ cartas, arquivos: {} }).manifesto
const grava = (nome: string, dados: Buffer) => writeFileSync(join(dir, nome), dados)

function comArquivo(nome: string, dados: Buffer, estado: 'gerada' | 'provisoria' | 'aprovada' = 'gerada') {
  grava(nome, dados)
  const m = manifestoVazio()
  const e = m.entradas.find((x) => x.id === `CC-${nome.slice(0, 3)}`)!
  e.estado = estado
  e.arquivo = nome
  e.verificacao = { largura: null, altura: null, bytes: dados.length, sha256: sha256(dados) }
  if (estado === 'provisoria') e.origem = 'recorte de teste'
  return m
}

describe('leitura de PNG/WebP', () => {
  it('lê dimensões de PNG e de WebP (VP8L)', () => {
    expect(lerInfoImagem(criarPng(30, 40))).toEqual({ ok: true, formato: 'png', largura: 30, altura: 40 })
    expect(lerInfoImagem(criarWebp(768, 1024))).toEqual({ ok: true, formato: 'webp', largura: 768, altura: 1024 })
  })

  it('recusa lixo, PNG truncado/corrompido e WebP truncado', () => {
    expect(lerInfoImagem(Buffer.from('isto não é imagem'))).toMatchObject({ ok: false })
    const png = criarPng(30, 40)
    expect(lerInfoImagem(png.subarray(0, png.length - 20))).toMatchObject({ ok: false })
    const corrompido = Buffer.from(png)
    corrompido[20] ^= 0xff
    expect(lerInfoImagem(corrompido)).toMatchObject({ ok: false, erro: expect.stringMatching(/CRC/) })
    const webp = criarWebp(30, 40)
    expect(lerInfoImagem(webp.subarray(0, webp.length - 5))).toMatchObject({ ok: false })
  })
})

describe('verificarArte', () => {
  it('com 0 imagens passa e relata 70 pendentes (pasta inexistente também)', () => {
    for (const diretorio of [dir, join(dir, 'nao-existe')]) {
      const r = verificarArte({ diretorio, manifesto: manifestoVazio() })
      expect(r.ok).toBe(true)
      expect(r.erros).toEqual([])
      expect(r.pendentes).toBe(70)
      expect(r.total).toBe(70)
      expect(formatarRelatorio(r)).toMatch(/70 pendente/)
    }
  })

  it('aceita WebP e PNG válidos 768x1024 sem erros nem avisos', () => {
    const r1 = verificarArte({ diretorio: dir, manifesto: comArquivo('101.webp', criarWebp(768, 1024, 1)) })
    expect(r1).toMatchObject({ ok: true, erros: [], avisos: [] })
    const r2 = verificarArte({ diretorio: dir, manifesto: comArquivo('102.png', criarPng(768, 1024, 2)) })
    expect(r2.ok).toBe(true)
    expect(r2.erros).toEqual([])
  })

  it('3:4 em outro tamanho aceitável gera só aviso de dimensão', () => {
    const r = verificarArte({ diretorio: dir, manifesto: comArquivo('103.webp', criarWebp(384, 512)) })
    expect(r.ok).toBe(true)
    expect(r.avisos.join(' ')).toMatch(/preferencial 768x1024/)
  })

  it('proporção errada (gerada) é erro', () => {
    const r = verificarArte({ diretorio: dir, manifesto: comArquivo('104.webp', criarWebp(800, 800)) })
    expect(r.ok).toBe(false)
    expect(r.erros.join(' ')).toMatch(/fora de 3:4/)
  })

  it('resolução abaixo do mínimo (gerada) é erro', () => {
    const r = verificarArte({ diretorio: dir, manifesto: comArquivo('105.png', criarPng(300, 400)) })
    expect(r.ok).toBe(false)
    expect(r.erros.join(' ')).toMatch(/abaixo do mínimo/)
  })

  it('provisória aceita com avisos de proporção e resolução (não falha)', () => {
    const r = verificarArte({ diretorio: dir, manifesto: comArquivo('106.png', criarPng(269, 225), 'provisoria') })
    expect(r.ok).toBe(true)
    expect(r.erros).toEqual([])
    expect(r.avisos.join('\n')).toMatch(/proporção.*provisória: apenas aviso/)
    expect(r.avisos.join('\n')).toMatch(/resolução.*provisória: apenas aviso/)
    expect(r.contagem.provisoria).toBe(1)
  })

  it('provisória inválida (arquivo corrompido) continua sendo erro', () => {
    const r = verificarArte({ diretorio: dir, manifesto: comArquivo('107.png', Buffer.from('lixo lixo lixo lixo lixo'), 'provisoria') })
    expect(r.ok).toBe(false)
  })

  it('extensão errada: conteúdo WebP em .png e jpg são erros', () => {
    const r = verificarArte({ diretorio: dir, manifesto: comArquivo('108.png', criarWebp(768, 1024)) })
    expect(r.erros.join(' ')).toMatch(/extensão \.png mas o conteúdo é WEBP/)
    grava('109.jpg', Buffer.from('x'))
    const r2 = verificarArte({ diretorio: dir, manifesto: manifestoVazio() })
    expect(r2.erros.join(' ')).toMatch(/109\.jpg: nome inválido/)
  })

  it('nomes que não correspondem a IDs são erros; arquivos não-imagem são ignorados', () => {
    grava('abc.png', criarPng(768, 1024))
    grava('090.png', criarPng(768, 1024, 9))
    grava('LEIA-ME.txt', Buffer.from('texto'))
    mkdirSync(join(dir, 'sub'))
    const r = verificarArte({ diretorio: dir, manifesto: manifestoVazio() })
    expect(r.erros.join('\n')).toMatch(/abc\.png: nome inválido/)
    expect(r.erros.join('\n')).toMatch(/090\.png: não corresponde a nenhum ID/)
    expect(r.erros.join('\n')).not.toMatch(/LEIA-ME/)
  })

  it('duplicados por sha256 e dois formatos para o mesmo ID são erros', () => {
    const png = criarPng(768, 1024, 7)
    grava('110.png', png)
    grava('111.png', png)
    const m = manifestoVazio()
    let r = verificarArte({ diretorio: dir, manifesto: m })
    expect(r.erros.join('\n')).toMatch(/111\.png: duplicado de 110\.png/)
    grava('110.webp', criarWebp(768, 1024, 3))
    r = verificarArte({ diretorio: dir, manifesto: m })
    expect(r.erros.join('\n')).toMatch(/CC-110: mais de um arquivo/)
  })

  it('arquivo grande demais ou minúsculo', () => {
    const r = verificarArte({ diretorio: dir, manifesto: comArquivo('112.png', criarPng(768, 1024, 5)), limites: { bytesMaximo: 100 } })
    expect(r.erros.join(' ')).toMatch(/grande demais/)
    const r2 = verificarArte({ diretorio: dir, manifesto: comArquivo('113.png', criarPng(768, 1024, 6)), limites: { bytesMinimo: 10_000_000 } })
    expect(r2.erros.join(' ')).toMatch(/pequeno demais/)
  })

  it('estado gerada/aprovada/provisória sem arquivo é erro; pendente com arquivo é aviso', () => {
    const m = manifestoVazio()
    m.entradas[0].estado = 'aprovada'
    m.entradas[1].estado = 'gerada'
    m.entradas[2].estado = 'provisoria'
    let r = verificarArte({ diretorio: dir, manifesto: m })
    expect(r.erros).toHaveLength(3)
    grava('120.png', criarPng(768, 1024, 8))
    r = verificarArte({ diretorio: dir, manifesto: m })
    expect(r.avisos.join('\n')).toMatch(/120\.png: manifesto marca CC-120 como pendente/)
  })

  it('arte APROVADA alterada (sha256 diferente do manifesto) é erro; gerada alterada é aviso', () => {
    const m = comArquivo('130.png', criarPng(768, 1024, 1), 'aprovada')
    grava('130.png', criarPng(768, 1024, 2))
    const r = verificarArte({ diretorio: dir, manifesto: m })
    expect(r.erros.join(' ')).toMatch(/APROVADA foi alterada sem autorização/)
    const m2 = comArquivo('131.png', criarPng(768, 1024, 3), 'gerada')
    grava('131.png', criarPng(768, 1024, 4))
    expect(verificarArte({ diretorio: dir, manifesto: m2 }).avisos.join(' ')).toMatch(/131\.png: sha256 difere do manifesto/)
  })

  it('avisa quando o prompt mudou depois da geração', () => {
    const m = comArquivo('140.webp', criarWebp(768, 1024, 4))
    m.entradas[39].promptHashGerado = 'hash-antigo'
    expect(verificarArte({ diretorio: dir, manifesto: m }).avisos.join(' ')).toMatch(/CC-140: o prompt mudou/)
  })
})
