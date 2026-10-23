// Catálogo reaproveitado do front por import relativo (sem duplicar o arquivo).
import dados from '../../src/data/cartas.json'

export const IDS_CATALOGO: ReadonlySet<string> = new Set(dados.cartas.map((c) => c.id))
