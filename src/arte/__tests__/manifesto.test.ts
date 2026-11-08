/// <reference types="node" />
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CATALOGO } from '../../data/catalogo'
import indiceDoBuild from '../indiceArte.json'
import { contarPorEstado, gerarIndice, nomeDeArquivo, sincronizarManifesto } from '../manifesto'
import type { InfoArquivo, Manifesto } from '../manifesto'
import { promptDaCarta } from '../prompts'
import { CAMINHOS, lerManifesto, serializar, sha256, sincronizarPasta } from './scripts'

const cartas = CATALOGO.map((c) => ({ id: c.id, nome: c.nome, prompt: promptDaCarta(c).prompt, promptHash: 'h-' + c.id }))
const info = (arquivo: string, sha = 'a'.repeat(64)): InfoArquivo => ({ arquivo, largura: 768, altura: 1024, bytes: 1000, sha256: sha })

describe('sincronizarManifesto (lógica pura)', () => {
  it('sem arquivos: 70 entradas únicas, todas pendentes, nomes estáveis NNN.webp', () => {
    const { manifesto, alertas } = sincronizarManifesto({ cartas, arquivos: {} })
    expect(alertas).toEqual([])
    expect(manifesto.entradas).toHaveLength(70)
    expect(new Set(manifesto.entradas.map((e) => e.id)).size).toBe(70)
    expect(manifesto.entradas.every((e) => e.estado === 'pendente')).toBe(true)
    expect(manifesto.entradas[0].arquivo).toBe('101.webp')
    expect(manifesto.entradas[69].arquivo).toBe('170.webp')
    expect(new Set(manifesto.entradas.map((e) => e.arquivo)).size).toBe(70)
    expect(manifesto.entradas[0].verificacao).toEqual({ largura: null, altura: null, bytes: null, sha256: null })
    expect(manifesto.estados).toEqual(['pendente', 'provisoria', 'gerada', 'aprovada', 'rejeitada'])
  })

  it('arquivo novo vira gerada (nunca aprovada) com sha256/dimensões', () => {
    const { manifesto, alertas } = sincronizarManifesto({ cartas, arquivos: { 'CC-105': info('005.png', 'b'.repeat(64)) } })
    const e = manifesto.entradas.find((x) => x.id === 'CC-105')!
    expect(e.estado).toBe('gerada')
    expect(e.arquivo).toBe('005.png')
    expect(e.verificacao).toEqual({ largura: 768, altura: 1024, bytes: 1000, sha256: 'b'.repeat(64) })
    expect(alertas).toHaveLength(1)
  })

  it('preserva estado, origem, observação e hashes existentes', () => {
    const base = sincronizarManifesto({ cartas, arquivos: { 'CC-101': info('101.png') } }).manifesto
    base.entradas[0].estado = 'provisoria'
    base.entradas[0].origem = 'recorte x'
    base.entradas[0].observacao = 'obs'
    base.entradas[0].promptHashGerado = 'zzz'
    const { manifesto } = sincronizarManifesto({ existente: base, cartas, arquivos: { 'CC-101': info('101.png') } })
    expect(manifesto.entradas[0]).toMatchObject({ estado: 'provisoria', origem: 'recorte x', observacao: 'obs', promptHashGerado: 'zzz' })
    expect(manifesto).toEqual(sincronizarManifesto({ existente: manifesto, cartas, arquivos: { 'CC-101': info('101.png') } }).manifesto)
  })

  it('gerada/provisória sem arquivo voltam a pendente com aviso', () => {
    const base = sincronizarManifesto({ cartas, arquivos: { 'CC-101': info('101.png') } }).manifesto
    const { manifesto, alertas } = sincronizarManifesto({ existente: base, cartas, arquivos: {} })
    expect(manifesto.entradas[0].estado).toBe('pendente')
    expect(manifesto.entradas[0].verificacao.sha256).toBeNull()
    expect(alertas[0]).toMatch(/ausente/)
  })

  it('arte APROVADA nunca é reescrita: sha256 alterado só gera alerta de erro', () => {
    const base = sincronizarManifesto({ cartas, arquivos: { 'CC-101': info('101.webp', 'c'.repeat(64)) } }).manifesto
    base.entradas[0].estado = 'aprovada'
    const alterado = sincronizarManifesto({ existente: base, cartas, arquivos: { 'CC-101': info('101.webp', 'd'.repeat(64)) } })
    expect(alterado.manifesto.entradas[0].estado).toBe('aprovada')
    expect(alterado.manifesto.entradas[0].verificacao.sha256).toBe('c'.repeat(64))
    expect(alterado.alertas.join(' ')).toMatch(/APROVADA foi alterada/)
    const sumiu = sincronizarManifesto({ existente: base, cartas, arquivos: {} })
    expect(sumiu.manifesto.entradas[0].estado).toBe('aprovada')
    expect(sumiu.alertas.join(' ')).toMatch(/APROVADA sem arquivo/)
  })

  it('atualiza prompt/hash e nome quando o catálogo muda, sem tocar no estado', () => {
    const base = sincronizarManifesto({ cartas, arquivos: {} }).manifesto
    base.entradas[3].estado = 'rejeitada'
    const novas = cartas.map((c) => (c.id === 'CC-104' ? { ...c, prompt: 'novo', promptHash: 'novo-hash', nome: 'Outro' } : c))
    const { manifesto } = sincronizarManifesto({ existente: base, cartas: novas, arquivos: {} })
    expect(manifesto.entradas[3]).toMatchObject({ estado: 'rejeitada', prompt: 'novo', promptHash: 'novo-hash', nome: 'Outro' })
  })

  it('índice do build só tem provisória/gerada/aprovada', () => {
    const base = sincronizarManifesto({ cartas, arquivos: { 'CC-101': info('101.png'), 'CC-102': info('102.webp'), 'CC-103': info('103.webp') } }).manifesto
    base.entradas[1].estado = 'aprovada'
    base.entradas[2].estado = 'rejeitada'
    expect(gerarIndice(base)).toEqual({ 'CC-101': { arquivo: '101.png', estado: 'gerada' }, 'CC-102': { arquivo: '102.webp', estado: 'aprovada' } })
    expect(contarPorEstado(base)).toEqual({ pendente: 67, provisoria: 0, gerada: 1, aprovada: 1, rejeitada: 1 })
  })

  it('nomeDeArquivo valida o ID', () => {
    expect(nomeDeArquivo('CC-107')).toBe('107.webp')
    expect(nomeDeArquivo('CC-107', 'png')).toBe('107.png')
    expect(() => nomeDeArquivo('007')).toThrow()
  })
})

describe('manifesto real do repositório (public/assets/cards/art/manifest.json)', () => {
  const m = lerManifesto() as Manifesto

  it('70 entradas com IDs do catálogo, únicas, na ordem, nomes estáveis', () => {
    expect(m.versao).toBe(1)
    expect(m.entradas.map((e) => e.id)).toEqual(CATALOGO.map((c) => c.id))
    for (const e of m.entradas) {
      expect(e.arquivo).toMatch(new RegExp(`^${e.id.slice(3)}\\.(webp|png)$`))
      expect(e.promptHash).toBe(sha256(e.prompt))
      expect(e.prompt).toBe(promptDaCarta(CATALOGO.find((c) => c.id === e.id)!).prompt)
    }
  })

  it('exatamente 70 geradas; nada pendente, provisório, aprovado ou rejeitado', () => {
    expect(contarPorEstado(m)).toEqual({ pendente: 0, provisoria: 0, gerada: 70, aprovada: 0, rejeitada: 0 })
    for (const e of m.entradas.filter((x) => x.estado === 'gerada')) {
      expect(e.arquivo).toBe(`${e.id.slice(3)}.webp`)
      expect(e.verificacao.largura).toBe(768)
      expect(e.verificacao.altura).toBe(1024)
      expect(e.verificacao.sha256).toMatch(/^[0-9a-f]{64}$/)
    }
  })

  it('os 70 arquivos existem e batem com sha256/bytes/dimensões registrados', () => {
    for (const e of m.entradas) {
      const dados = readFileSync(join(CAMINHOS.dirArte, e.arquivo))
      expect(createHash('sha256').update(dados).digest('hex')).toBe(e.verificacao.sha256)
      expect(dados.length).toBe(e.verificacao.bytes)
      expect(e.verificacao.largura).toBeGreaterThan(200)
      expect(e.verificacao.altura).toBeGreaterThan(150)
    }
  })

  it('não falta nenhuma das 70 imagens do catálogo', () => {
    for (const e of m.entradas) expect(existsSync(join(CAMINHOS.dirArte, e.arquivo)), e.arquivo).toBe(true)
  })

  it('manifesto e índice do build estão em dia com o catálogo e a pasta (sem deriva)', () => {
    const r = sincronizarPasta({ escrever: false })
    expect(serializar(r.manifesto)).toBe(readFileSync(CAMINHOS.manifesto, 'utf8'))
    expect(r.indice).toEqual(indiceDoBuild)
    expect(Object.keys(indiceDoBuild).sort()).toEqual(CATALOGO.map((c) => c.id).sort())
  })
})
