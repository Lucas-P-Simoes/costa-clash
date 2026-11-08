import { describe, expect, it } from 'vitest'
import { CATALOGO } from '../../data/catalogo'
import { IDS_PILOTO } from '../piloto'
import { COMPOSICOES, FRASE_FINAL, PALETAS, PREFIXO_ESTILO, SujeitoAusenteError, baseDoArquivo, montarPrompt, numeroDoId, promptDaCarta, promptsDoCatalogo, seedsSugeridas } from '../prompts'
import { SUJEITOS } from '../sujeitos'

const idiomas = ['pt', 'en'] as const

describe('sujeitos derivados das 70 cartas atuais', () => {
  it('não mantém sujeitos editoriais das cartas removidas', () => {
    expect(SUJEITOS).toEqual({})
    expect(CATALOGO).toHaveLength(70)
  })

  it('todo prompt deriva assunto, paleta e composição válidos dos metadados', () => {
    for (const carta of CATALOGO) {
      const p = promptDaCarta(carta)
      expect(Object.keys(COMPOSICOES)).toContain(p.forma)
      expect(Object.keys(PALETAS)).toContain(p.paleta)
      if (carta.id === 'CC-153') {
        expect(p.prompt).toContain('Sessilia')
        expect(p.prompt).toContain('costão')
      } else {
        expect(p.prompt).toContain(carta.informacao!.classificacao)
        expect(p.prompt).toContain(carta.informacao!.ambiente)
      }
    }
  })
})

describe('gerador de prompts', () => {
  it('é determinístico', () => {
    for (const c of CATALOGO) for (const i of idiomas) expect(montarPrompt(c, i)).toBe(montarPrompt({ ...c }, i))
  })

  it('todo prompt começa com o prefixo de estilo e termina com os negativos', () => {
    for (const c of CATALOGO) for (const i of idiomas) {
      const p = montarPrompt(c, i)
      expect(p.startsWith(PREFIXO_ESTILO[i]), c.id).toBe(true)
      expect(p.endsWith(FRASE_FINAL[i]), c.id).toBe(true)
    }
  })

  it('não sugere ID, ATK/DEF ou aspas como texto visual', () => {
    for (const c of CATALOGO) for (const i of idiomas) {
      const corpo = montarPrompt(c, i).slice(0, -FRASE_FINAL[i].length)
      expect(corpo, c.id).not.toMatch(/CC-\d/)
      expect(corpo, c.id).not.toMatch(/\bATK\b|\bDEF\b/)
      expect(corpo, c.id).not.toMatch(/["“”«»]/)
    }
  })

  it('gera 70 prompts distintos com assunto, paleta e composição', () => {
    const todos = promptsDoCatalogo(CATALOGO)
    expect(new Set(todos.map((p) => p.prompt)).size).toBe(70)
    const t = promptDaCarta(CATALOGO[0])
    expect(t.prompt).toContain(CATALOGO[0].nome)
    expect(t.prompt).toContain(PALETAS.vidaMarinha.pt)
    expect(t.prompt).toContain('3:4')
  })

  it('o prefixo descreve o DNA visual da referência', () => {
    expect(PREFIXO_ESTILO.pt).toMatch(/pixel art retrô/)
    expect(PREFIXO_ESTILO.pt).toMatch(/cena completa/)
    expect(PREFIXO_ESTILO.pt).toMatch(/3:4/)
  })

  it('carta sem sujeito falha com erro claro', () => {
    expect(() => montarPrompt({ id: 'CC-999' })).toThrow(SujeitoAusenteError)
  })

  it('nome de arquivo e seeds são estáveis', () => {
    expect(baseDoArquivo('CC-118')).toBe('118')
    expect(baseDoArquivo('CC-170')).toBe('170')
    expect(numeroDoId('CC-101')).toBe(101)
    expect(() => numeroDoId('X-1')).toThrow()
    expect(new Set(seedsSugeridas('CC-118')).size).toBe(3)
    expect(seedsSugeridas('CC-118')).not.toEqual(seedsSugeridas('CC-119'))
  })

  it('lote piloto usa somente cartas atuais', () => {
    expect(IDS_PILOTO).toEqual(['CC-101', 'CC-131', 'CC-153', 'CC-170'])
  })
})
