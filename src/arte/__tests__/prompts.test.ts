import { describe, expect, it } from 'vitest'
import { CATALOGO } from '../../data/catalogo'
import { IDS_PILOTO } from '../piloto'
import { COMPOSICOES, FRASE_FINAL, PALETAS, PREFIXO_ESTILO, SujeitoAusenteError, baseDoArquivo, montarPrompt, numeroDoId, promptDaCarta, promptsDoCatalogo, seedsSugeridas } from '../prompts'
import { SUJEITOS } from '../sujeitos'

const idiomas = ['pt', 'en'] as const

describe('sujeitos das 100 cartas', () => {
  it('há um sujeito por ID do catálogo, nem a mais nem a menos', () => {
    expect(Object.keys(SUJEITOS).sort()).toEqual(CATALOGO.map((c) => c.id).sort())
    expect(CATALOGO).toHaveLength(100)
  })

  it('nenhum sujeito vazio, com forma e paleta válidas', () => {
    for (const c of CATALOGO) {
      const s = SUJEITOS[c.id]
      expect(s.pt.trim().length, c.id).toBeGreaterThan(40)
      expect(s.en.trim().length, c.id).toBeGreaterThan(40)
      expect(Object.keys(COMPOSICOES), c.id).toContain(s.forma)
      expect(Object.keys(PALETAS), c.id).toContain(s.paleta)
    }
  })

  it('nenhum sujeito duplicado (em português nem em inglês)', () => {
    for (const idioma of idiomas) {
      const textos = CATALOGO.map((c) => SUJEITOS[c.id][idioma].trim().toLowerCase())
      expect(new Set(textos).size, idioma).toBe(100)
    }
  })

  it('exemplos do dono estão representados', () => {
    const t = (id: string) => SUJEITOS[id].pt.toLowerCase()
    expect(t('CC-001')).toContain('mangue')
    expect(t('CC-001')).toContain('raízes')
    expect(t('CC-048')).toMatch(/rocha|pedra/)
    expect(t('CC-047')).toMatch(/lixo|plástic/)
    expect(t('CC-057')).toContain('onda')
    expect(t('CC-002')).toMatch(/restinga/)
    expect(t('CC-018')).toContain('tartaruga')
    expect(t('CC-018')).toContain('coral')
    expect(t('CC-033')).toMatch(/orla|urban/)
    expect(t('CC-073')).toContain('tratamento de esgoto')
    expect(t('CC-073')).toContain('purificada')
  })

  it('não declara que algo elimina totalmente um risco', () => {
    for (const c of CATALOGO) expect(SUJEITOS[c.id].pt.toLowerCase(), c.id).not.toMatch(/elimina|acaba com|resolve totalmente|100%/)
  })

  it('impactos são criaturas ou fenômenos (sem apologia), ações e soluções são cenas/objetos', () => {
    for (const c of CATALOGO.filter((x) => x.grupo === 'impacto')) expect(['criatura', 'cena', 'paisagem'], c.id).toContain(SUJEITOS[c.id].forma)
    for (const c of CATALOGO.filter((x) => x.tipo === 'armadilha')) expect(SUJEITOS[c.id].forma, c.id).toBe('simbolo')
    for (const c of CATALOGO.filter((x) => x.subtipo === 'terreno')) expect(SUJEITOS[c.id].forma, c.id).toBe('paisagem')
    for (const c of CATALOGO.filter((x) => x.subtipo === 'equipamento')) expect(SUJEITOS[c.id].forma, c.id).toBe('objeto')
  })
})

describe('gerador de prompts', () => {
  it('é determinístico', () => {
    for (const c of CATALOGO) for (const i of idiomas) expect(montarPrompt(c, i)).toBe(montarPrompt({ ...c }, i))
  })

  it('todo prompt começa com o prefixo de estilo e termina com os negativos', () => {
    for (const c of CATALOGO) {
      for (const i of idiomas) {
        const p = montarPrompt(c, i)
        expect(p.startsWith(PREFIXO_ESTILO[i]), c.id).toBe(true)
        expect(p.endsWith(FRASE_FINAL[i]), c.id).toBe(true)
      }
      expect(montarPrompt(c, 'pt').endsWith('Sem texto, sem moldura, sem ATK/DEF, sem logotipo.')).toBe(true)
    }
  })

  it('nada para escrever na imagem: sem nome da carta, ID, ATK/DEF ou aspas fora dos negativos', () => {
    for (const c of CATALOGO) {
      for (const i of idiomas) {
        const p = montarPrompt(c, i)
        const corpo = p.slice(0, p.length - FRASE_FINAL[i].length)
        expect(corpo, c.id).not.toContain(c.nome)
        expect(corpo, c.id).not.toMatch(/CC-\d/)
        expect(corpo, c.id).not.toMatch(/\bATK\b|\bDEF\b/)
        expect(corpo, c.id).not.toMatch(/["“”«»]/)
      }
    }
  })

  it('prompts diferentes para cartas diferentes; contêm assunto, paleta e composição', () => {
    const todos = promptsDoCatalogo(CATALOGO)
    expect(new Set(todos.map((p) => p.prompt)).size).toBe(100)
    const t = promptDaCarta(CATALOGO[0])
    expect(t.prompt).toContain(SUJEITOS['CC-001'].pt)
    expect(t.prompt).toContain(PALETAS.ecossistema.pt)
    expect(t.prompt).toContain('3:4')
    expect(t.paletaRotulo).toMatch(/Ecossistemas/)
  })

  it('o prefixo descreve o DNA visual da referência (pixel art, cena completa, sem foto)', () => {
    expect(PREFIXO_ESTILO.pt).toMatch(/pixel art retrô/)
    expect(PREFIXO_ESTILO.pt).toMatch(/cena completa/)
    expect(PREFIXO_ESTILO.pt).toMatch(/3:4/)
  })

  it('carta sem sujeito falha com erro claro', () => {
    expect(() => montarPrompt({ id: 'CC-999' })).toThrow(SujeitoAusenteError)
  })

  it('nome de arquivo e seeds são estáveis', () => {
    expect(baseDoArquivo('CC-018')).toBe('018')
    expect(baseDoArquivo('CC-100')).toBe('100')
    expect(numeroDoId('CC-001')).toBe(1)
    expect(() => numeroDoId('X-1')).toThrow()
    expect(seedsSugeridas('CC-018')).toEqual(seedsSugeridas('CC-018'))
    expect(new Set(seedsSugeridas('CC-018')).size).toBe(3)
    expect(seedsSugeridas('CC-018')).not.toEqual(seedsSugeridas('CC-019'))
  })

  it('lote piloto tem as 5 cartas pedidas', () => {
    expect(IDS_PILOTO).toEqual(['CC-001', 'CC-018', 'CC-047', 'CC-031', 'CC-073'])
  })
})
