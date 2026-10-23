import { describe, expect, it } from 'vitest'
import { OPONENTES, OPONENTE_PADRAO_ID, ROTULO_DIFICULDADE, buscarOponente, urlArquivoOponente } from '../oponentes'

describe('dados dos adversários', () => {
  it('tem 16 adversários com id e nome únicos, na ordem da referência', () => {
    expect(OPONENTES).toHaveLength(16)
    expect(new Set(OPONENTES.map((o) => o.id)).size).toBe(16)
    expect(new Set(OPONENTES.map((o) => o.nome)).size).toBe(16)
    expect(OPONENTES.map((o) => o.nome)).toEqual([
      'Guardião do Manguezal', 'Fiscal Ambiental', 'Pescador Tradicional', 'Tartaruga Marinha',
      'Poluição do Mar', 'Erosão Costeira', 'Ressaca', 'Urbanização',
      'Restinga', 'Coral', 'Chuva Intensa', 'Porto',
      'Comunidade Caiçara', 'Recuperação Ambiental', 'Planejamento Costeiro', 'Biodiversidade Costeira',
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

  it('grupos de Urbanização e Porto alinhados ao catálogo; textos revisados', () => {
    expect(buscarOponente('urbanizacao')!.grupo).toBe('atividade') // CC-033 Urbanização Planejada
    expect(buscarOponente('porto')!.grupo).toBe('impacto') // CC-058 Expansão Portuária
    expect(buscarOponente('tartaruga-marinha')!.descricao).toMatch(/^Várias espécies/)
    expect(buscarOponente('comunidade-caicara')!.descricao).toMatch(/agricultura em pequena escala e extrativismo/)
    expect(buscarOponente('biodiversidade-costeira')!.descricao).not.toMatch(/equilíbrio/)
  })

  it('não afirma que algo elimina totalmente um risco', () => {
    for (const o of OPONENTES) expect(o.descricao).not.toMatch(/elimina|acaba com|resolve totalmente|zera/i)
  })
})
