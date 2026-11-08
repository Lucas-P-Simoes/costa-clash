// Baralhos dos 17 adversários do Duelo Livre. PROVISÓRIOS (aguardam revisão/balanceamento do responsável).
// Cada baralho tem exatamente 40 cartas, no máximo 3 por ID e usa somente CC-101…CC-170.
// A afinidade ambiental informada na planilha guia a composição; a dificuldade prioriza cartas mais fracas,
// intermediárias ou mais fortes. A IA joga com as mesmas regras em todos os níveis.

import { CATALOGO } from './catalogo'

// Este módulo também é importado pelo Worker, portanto não pode depender de `oponentes.ts`,
// que usa `import.meta.glob` do Vite para resolver retratos. O teste de baralhos confere esta
// lista contra OPONENTES para impedir divergência entre os dois ambientes.
const OPONENTES_DO_DUELO = [
  { id: 'guardiao-manguezal', dificuldade: 1 },
  { id: 'mancha-de-oleo', dificuldade: 1 },
  { id: 'erosao-costeira', dificuldade: 2 },
  { id: 'ressaca', dificuldade: 2 },
  { id: 'urbanizacao', dificuldade: 3 },
  { id: 'porto', dificuldade: 3 },
  { id: 'poluicao-plastica', dificuldade: 2 },
  { id: 'esgoto-clandestino', dificuldade: 2 },
  { id: 'pesca-predatoria', dificuldade: 2 },
  { id: 'especies-invasoras', dificuldade: 3 },
  { id: 'mare-vermelha', dificuldade: 3 },
  { id: 'residuos-quimicos', dificuldade: 3 },
  { id: 'mineracao', dificuldade: 3 },
  { id: 'bitucas-na-areia', dificuldade: 3 },
  { id: 'poluicao-farmacos', dificuldade: 3 },
  { id: 'guardiao-corrompido', dificuldade: 3 },
  { id: 'ser-humano', dificuldade: 3 },
] as const

const OPONENTES_POR_AMBIENTE: Readonly<Record<string, readonly string[]>> = {
  Manguezal: ['guardiao-manguezal', 'esgoto-clandestino', 'urbanizacao', 'guardiao-corrompido'],
  'Praia Arenosa': ['erosao-costeira', 'poluicao-plastica', 'bitucas-na-areia', 'mineracao'],
  'Costão Rochoso': ['porto', 'especies-invasoras', 'residuos-quimicos', 'poluicao-farmacos'],
  Infralitoral: ['mancha-de-oleo', 'pesca-predatoria', 'mare-vermelha', 'ressaca'],
  Antártica: ['ser-humano', 'pesca-predatoria', 'ressaca'],
  'Ilhas Oceânicas': ['ser-humano', 'porto'],
  'Águas Profundas': ['pesca-predatoria', 'ser-humano'],
  'Costa do Pacífico': ['especies-invasoras', 'ser-humano'],
  'Costa Brasileira': ['ser-humano', 'poluicao-plastica'],
}

const POR_ID = new Map(CATALOGO.map((carta) => [carta.id, carta]))

function forca(id: string): number {
  const carta = POR_ID.get(id)
  return (carta?.atk ?? 0) + (carta?.defesa ?? 0)
}

function afinidadesDoOponente(oponenteId: string): string[] {
  return CATALOGO.filter((carta) => {
    const ambiente = carta.informacao?.ambiente
    return ambiente ? OPONENTES_POR_AMBIENTE[ambiente]?.includes(oponenteId) : false
  }).map((carta) => carta.id)
}

/** Garante que cada carta apareça em pelo menos um baralho, distribuindo por ambiente em rodízio. */
function cartasObrigatoriasPorOponente(): Map<string, string[]> {
  const resultado = new Map<string, string[]>()
  const cursores = new Map<string, number>()
  for (const carta of CATALOGO) {
    const ambiente = carta.informacao?.ambiente
    const candidatos = ambiente ? OPONENTES_POR_AMBIENTE[ambiente] : undefined
    if (!candidatos?.length) throw new Error(`Sem afinidade de oponente para ${carta.id}: ${ambiente ?? 'sem ambiente'}`)
    const cursor = cursores.get(ambiente!) ?? 0
    const oponente = candidatos[cursor % candidatos.length]
    cursores.set(ambiente!, cursor + 1)
    resultado.set(oponente, [...(resultado.get(oponente) ?? []), carta.id])
  }
  return resultado
}

function ordenarPorDificuldade(ids: readonly string[], dificuldade: 1 | 2 | 3): string[] {
  const ordenados = [...new Set(ids)].sort((a, b) => forca(a) - forca(b) || a.localeCompare(b))
  if (dificuldade === 3) return ordenados.reverse()
  if (dificuldade === 1) return ordenados
  const meio = Math.floor(ordenados.length / 2)
  return [...ordenados.slice(meio), ...ordenados.slice(0, meio)]
}

function montarBaralho(oponenteId: string, dificuldade: 1 | 2 | 3, obrigatorias: readonly string[]): string[] {
  const afins = ordenarPorDificuldade(afinidadesDoOponente(oponenteId), dificuldade)
  const todas = ordenarPorDificuldade(CATALOGO.map((carta) => carta.id), dificuldade)
  const escolhidas = [...new Set(obrigatorias)]
  for (const id of [...afins, ...todas]) {
    if (escolhidas.length >= 14) break
    if (!escolhidas.includes(id)) escolhidas.push(id)
  }
  if (escolhidas.length < 14) throw new Error(`Catálogo insuficiente para montar o baralho de ${oponenteId}`)

  const ordemDeCopia = ordenarPorDificuldade(escolhidas, dificuldade)
  const baralho = [...escolhidas]
  for (let copia = 2; copia <= 3 && baralho.length < 40; copia += 1) {
    for (const id of ordemDeCopia) {
      if (baralho.length >= 40) break
      baralho.push(id)
    }
  }
  return baralho
}

const OBRIGATORIAS = cartasObrigatoriasPorOponente()

/** id do oponente (src/data/oponentes.ts) -> 40 IDs de carta. */
export const BARALHOS_OPONENTES: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  OPONENTES_DO_DUELO.map((oponente) => [oponente.id, montarBaralho(oponente.id, oponente.dificuldade, OBRIGATORIAS.get(oponente.id) ?? [])]),
)

export function baralhoDoOponente(id: string): readonly string[] | undefined {
  return Object.hasOwn(BARALHOS_OPONENTES, id) ? BARALHOS_OPONENTES[id] : undefined
}
