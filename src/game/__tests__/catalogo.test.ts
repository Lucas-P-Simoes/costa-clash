import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CATALOGO } from '../../data/catalogo'

const CABECALHO_CSV = [
  'id',
  'nome',
  'tipo',
  'grupo_ou_subtipo',
  'atk',
  'def',
  'efeito_json',
  'informacao_educativa',
  'classificacao',
  'ambiente',
  'caracteristica',
] as const

function campoCsv(valor: unknown): string {
  const texto = valor === null || valor === undefined ? '' : typeof valor === 'object' ? JSON.stringify(valor) : String(valor)
  return /[",\r\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto
}

function csvCanonico(): string {
  const linhas = CATALOGO.map((carta) =>
    [
      carta.id,
      carta.nome,
      carta.tipo,
      carta.grupo,
      carta.atk,
      carta.defesa,
      carta.efeito,
      carta.educacao,
      carta.informacao?.classificacao,
      carta.informacao?.ambiente,
      carta.informacao?.caracteristica,
    ]
      .map(campoCsv)
      .join(','),
  )
  return [CABECALHO_CSV.join(','), ...linhas].join('\n') + '\n'
}

describe('catálogo de cartas', () => {
  it('tem 70 IDs e nomes únicos', () => {
    expect(CATALOGO).toHaveLength(70)
    expect(new Set(CATALOGO.map((c) => c.id)).size).toBe(70)
    expect(new Set(CATALOGO.map((c) => c.nome)).size).toBe(70)
  })

  it('tem 70 unidades e nenhuma carta de ação, armadilha ou equipamento', () => {
    expect(CATALOGO).toHaveLength(70)
    expect(CATALOGO.every((c) => c.tipo === 'unidade')).toBe(true)
  })

  it('unidades têm ATK/DEF inteiros não negativos; demais não têm atributos', () => {
    for (const c of CATALOGO) {
      if (c.tipo === 'unidade') {
        expect(Number.isInteger(c.atk) && (c.atk as number) >= 0).toBe(true)
        expect(Number.isInteger(c.defesa) && (c.defesa as number) >= 0).toBe(true)
        expect(c.efeito).toBeNull()
      } else {
        expect(c.atk).toBeNull()
        expect(c.defesa).toBeNull()
        expect(c.efeito).not.toBeNull()
      }
    }
  })

  it('mantém exclusivamente os IDs 101-170', () => {
    const esperados = Array.from({ length: 70 }, (_, i) => `CC-${String(i + 101).padStart(3, '0')}`)
    expect(CATALOGO.map((c) => c.id)).toEqual(esperados)
    expect(CATALOGO.find((c) => c.id === 'CC-153')).toMatchObject({ nome: 'CRISTA-DE-GALO', atk: 500, defesa: 500 })
  })

  it('as 70 importadas preservam informação estruturada da planilha', () => {
    expect(CATALOGO).toHaveLength(70)
    for (const c of CATALOGO) {
      expect(c).toMatchObject({ tipo: 'unidade', grupo: 'fauna' })
      expect(c.informacao?.classificacao.trim().length, c.id).toBeGreaterThan(0)
      expect(c.informacao?.ambiente.trim().length, c.id).toBeGreaterThan(0)
      expect(c.informacao?.caracteristica?.trim().length, c.id).toBeGreaterThan(0)
    }
  })

  it('cartas.csv é uma projeção determinística e completa do catálogo JSON', () => {
    const csv = readFileSync(resolve(process.cwd(), 'cartas.csv'), 'utf8').replace(/^\uFEFF/, '').replaceAll('\r\n', '\n')
    expect(csv).toBe(csvCanonico())
  })
})
