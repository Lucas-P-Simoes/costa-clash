import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { OPONENTES, OPONENTE_PADRAO_ID, ROTULO_DIFICULDADE, buscarOponente, urlArquivoOponente } from '../oponentes'

describe('dados dos adversários', () => {
  it('tem 17 adversários com id e nome únicos, na ordem definida pelo dono (08/11/2026)', () => {
    expect(OPONENTES).toHaveLength(17)
    expect(new Set(OPONENTES.map((o) => o.id)).size).toBe(17)
    expect(new Set(OPONENTES.map((o) => o.nome)).size).toBe(17)
    expect(OPONENTES.map((o) => o.nome)).toEqual([
      'Guardião do Mangue', 'Mancha de Óleo', 'Erosão Costeira', 'Ressaca',
      'Urbanização', 'Porto', 'Poluição Plástica', 'Esgoto Clandestino',
      'Pesca Predatória', 'Espécies Invasoras', 'Maré Vermelha', 'Resíduos Químicos',
      'Mineração', 'Bitucas na Areia', 'Poluição por Fármacos', 'Guardião do Mangue Corrompido', 'Ser Humano',
    ])
    expect(OPONENTES.map((o) => o.id)).toEqual([
      'guardiao-manguezal', 'mancha-de-oleo', 'erosao-costeira', 'ressaca',
      'urbanizacao', 'porto', 'poluicao-plastica', 'esgoto-clandestino',
      'pesca-predatoria', 'especies-invasoras', 'mare-vermelha', 'residuos-quimicos',
      'mineracao', 'bitucas-na-areia', 'poluicao-farmacos', 'guardiao-corrompido', 'ser-humano',
    ])
  })

  it('dificuldade 1-3, grupo válido e descrição preenchida', () => {
    for (const o of OPONENTES) {
      expect([1, 2, 3]).toContain(o.dificuldade)
      expect(ROTULO_DIFICULDADE[o.dificuldade]).toBeTruthy()
      if (o.grupo) expect(['ecossistema', 'fauna', 'atividade', 'impacto']).toContain(o.grupo)
      expect(o.descricao.length).toBeGreaterThan(20)
      expect(o.descricao.length).toBeLessThan(200)
    }
  })

  it('arquivos de retrato (e arte grande) existem em src/assets/oponentes', () => {
    for (const o of OPONENTES) {
      for (const arquivo of [o.retrato, o.retratoGrande].filter((a): a is string => !!a)) {
        // O resolvedor vem de import.meta.glob sobre src/assets/oponentes: só há URL se o arquivo existe.
        expect(urlArquivoOponente(arquivo), arquivo).toBeTruthy()
      }
    }
  })

  it('Ressaca é o padrão: nível médio e descrição da referência', () => {
    const r = buscarOponente(OPONENTE_PADRAO_ID)!
    expect(r.nome).toBe('Ressaca')
    expect(r.dificuldade).toBe(2)
    expect(r.descricao).toBe('Domina cartas de impacto costeiro, como ressacas, inundações e aumento do nível do mar.')
  })

  it('Guardião do Mangue mantém o retrato original na grade e usa panorama próprio no painel', () => {
    const guardiao = buscarOponente('guardiao-manguezal')!
    expect(guardiao.retrato).toBe('guardiao-manguezal.png')
    expect(guardiao.retratoGrande).toBe('guardiao-manguezal-grande.png')
    expect(urlArquivoOponente(guardiao.retratoGrande!)).toBeTruthy()
  })

  it('o atalho Baralho tem asset empacotado', () => {
    expect(urlArquivoOponente('baralho.png')).toBeTruthy()
  })

  it('os 12 chefes destacados usam retratos próprios, únicos e empacotados', () => {
    const ids = [
      'mancha-de-oleo', 'poluicao-plastica', 'esgoto-clandestino', 'pesca-predatoria',
      'especies-invasoras', 'mare-vermelha', 'residuos-quimicos', 'mineracao',
      'bitucas-na-areia', 'poluicao-farmacos', 'guardiao-corrompido', 'ser-humano',
    ]
    const retratos = ids.map((id) => {
      const oponente = buscarOponente(id)!
      expect(oponente.retrato).toBe(`${id}.png`)
      expect(urlArquivoOponente(oponente.retrato), oponente.retrato).toBeTruthy()
      return oponente.retrato
    })

    expect(new Set(retratos).size).toBe(ids.length)
    expect(buscarOponente('guardiao-corrompido')!.retratoGrande).toBe('guardiao-corrompido.png')
  })

  it('os 12 PNGs finais são 768x512 e batem com o registro de prompts/hashes', () => {
    const registro = JSON.parse(readFileSync(join(import.meta.dirname, '../../../docs/arte/prompts-oponentes.json'), 'utf8')) as {
      gerador: string
      artes: { id: string; arquivo: string; sha256: string; promptEspecifico: string }[]
    }
    expect(registro.gerador).toBe('ImageGen built-in')
    expect(registro.artes).toHaveLength(12)

    for (const arte of registro.artes) {
      expect(arte.promptEspecifico.length).toBeGreaterThan(80)
      const dados = readFileSync(join(import.meta.dirname, '../../assets/oponentes', `${arte.id}.png`))
      expect(dados.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
      expect(dados.readUInt32BE(16)).toBe(768)
      expect(dados.readUInt32BE(20)).toBe(512)
      expect(createHash('sha256').update(dados).digest('hex')).toBe(arte.sha256.toLowerCase())
    }
  })

  it('grupos de Urbanização e Porto alinhados ao catálogo; textos revisados', () => {
    expect(buscarOponente('urbanizacao')!.grupo).toBe('atividade') // CC-133 OURIÇO-DO-MAR-VERDE
    expect(buscarOponente('porto')!.grupo).toBe('impacto') // CC-158 CARANGUEJO-ARANHA
  })

  it('não afirma que algo elimina totalmente um risco', () => {
    for (const o of OPONENTES) expect(o.descricao).not.toMatch(/elimina|acaba com|resolve totalmente|zera/i)
  })
})
