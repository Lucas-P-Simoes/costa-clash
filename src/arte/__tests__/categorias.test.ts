import { describe, expect, it } from 'vitest'
import { CATALOGO } from '../../data/catalogo'
import { CATEGORIAS, IDS_COM_AJUSTE, ORDEM_CATEGORIAS, SELO_GRADES, SELO_PALETAS, classificarCarta } from '../categorias'
import type { SeloId } from '../categorias'

const carta = (id: string) => CATALOGO.find((c) => c.id === id)!

describe('mapa categoria -> cor/selo', () => {
  it('7 categorias com cores de moldura distintas e selo padrão válido', () => {
    expect(ORDEM_CATEGORIAS).toHaveLength(7)
    expect(Object.keys(CATEGORIAS).sort()).toEqual([...ORDEM_CATEGORIAS].sort())
    const cores = ORDEM_CATEGORIAS.map((id) => CATEGORIAS[id].borda)
    expect(new Set(cores).size).toBe(7)
    for (const id of ORDEM_CATEGORIAS) {
      expect(CATEGORIAS[id].borda).toMatch(/^#[0-9a-f]{6}$/)
      expect(SELO_GRADES[CATEGORIAS[id].selo]).toBeTruthy()
    }
  })

  it('segue a referência: azul=gota, verde=folha, vermelho=triângulo, roxo=diabinho, cinza=concha, dourado=estrela, ondas=onda', () => {
    expect(CATEGORIAS.marinha.selo).toBe('gota')
    expect(CATEGORIAS.verde.selo).toBe('folha')
    expect(CATEGORIAS.fenomeno.selo).toBe('triangulo')
    expect(CATEGORIAS.impacto.selo).toBe('diabinho')
    expect(CATEGORIAS.protegida.selo).toBe('concha')
    expect(CATEGORIAS.planejamento.selo).toBe('estrela')
    expect(CATEGORIAS.ondas.selo).toBe('onda')
  })

  it('classifica as 100 cartas com categoria e selo existentes', () => {
    for (const c of CATALOGO) {
      const v = classificarCarta(c)
      expect(CATEGORIAS[v.categoria], c.id).toBeTruthy()
      expect(SELO_GRADES[v.selo], c.id).toBeTruthy()
    }
  })

  it('cartas piloto e exemplos da referência', () => {
    expect(classificarCarta(carta('CC-018'))).toEqual({ categoria: 'marinha', selo: 'gota' })
    expect(classificarCarta(carta('CC-001'))).toEqual({ categoria: 'verde', selo: 'folha' })
    expect(classificarCarta(carta('CC-047'))).toEqual({ categoria: 'impacto', selo: 'diabinho' })
    expect(classificarCarta(carta('CC-031'))).toEqual({ categoria: 'ondas', selo: 'onda' })
    expect(classificarCarta(carta('CC-073'))).toEqual({ categoria: 'protegida', selo: 'engrenagem' })
    expect(classificarCarta(carta('CC-067'))).toEqual({ categoria: 'impacto', selo: 'caveira' })
    expect(classificarCarta(carta('CC-057')).categoria).toBe('ondas')
  })

  it('padrão por tipo + grupo quando não há ajuste', () => {
    expect(classificarCarta(carta('CC-019')).categoria).toBe('marinha') // fauna
    expect(classificarCarta(carta('CC-034')).categoria).toBe('planejamento') // atividade
    expect(classificarCarta(carta('CC-049')).categoria).toBe('impacto') // impacto
    expect(classificarCarta(carta('CC-078')).categoria).toBe('planejamento') // ação
    expect(classificarCarta(carta('CC-086')).categoria).toBe('protegida') // equipamento
    expect(classificarCarta(carta('CC-093')).categoria).toBe('protegida') // armadilha
    expect(classificarCarta(carta('CC-004')).categoria).toBe('verde') // ecossistema
  })

  it('ajustes por carta só citam IDs do catálogo', () => {
    const ids = new Set(CATALOGO.map((c) => c.id))
    for (const id of IDS_COM_AJUSTE) expect(ids.has(id), id).toBe(true)
  })

  it('pictogramas são grades 12x12 cujos caracteres existem na paleta do selo', () => {
    for (const [selo, grade] of Object.entries(SELO_GRADES) as [SeloId, readonly string[]][]) {
      expect(grade, selo).toHaveLength(12)
      for (const linha of grade) {
        expect(linha, selo).toHaveLength(12)
        for (const ch of linha) if (ch !== '.') expect(SELO_PALETAS[selo][ch], `${selo} '${ch}'`).toBeTruthy()
      }
      expect(grade.join('').replace(/\./g, '').length, selo).toBeGreaterThan(20)
    }
  })
})
