// Progressão do Duelo Livre: os adversários são vencidos em ordem (a ordem de `OPONENTES`).
// O primeiro está sempre liberado; cada vitória libera o seguinte. Funções puras + persistência local por conta.
import { OPONENTES } from './oponentes'

type Armazenamento = Pick<Storage, 'getItem' | 'setItem'>

const PREFIXO = 'costa-clash:derrotados:'

function armazenamentoPadrao(): Armazenamento | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/** Ids bloqueados: adversário cujo antecessor na ordem não foi derrotado e que não foi liberado manualmente (engrenagem). */
export function idsBloqueados(derrotados: readonly string[], liberados: readonly string[] = []): ReadonlySet<string> {
  const vencidos = new Set(derrotados)
  const manuais = new Set(liberados)
  return new Set(OPONENTES.filter((o, i) => i > 0 && !vencidos.has(OPONENTES[i - 1].id) && !manuais.has(o.id)).map((o) => o.id))
}

/** Primeiro adversário (na ordem) ainda não derrotado; se todos foram vencidos, o último. */
export function proximoAdversarioId(derrotados: readonly string[]): string {
  const vencidos = new Set(derrotados)
  return (OPONENTES.find((o) => !vencidos.has(o.id)) ?? OPONENTES[OPONENTES.length - 1]).id
}

export function lerDerrotados(usuarioId: string | undefined, armazenamento: Armazenamento | null = armazenamentoPadrao()): string[] {
  try {
    const bruto = armazenamento?.getItem(PREFIXO + (usuarioId ?? 'visitante'))
    const lista: unknown = bruto ? JSON.parse(bruto) : []
    const validos = new Set(OPONENTES.map((o) => o.id))
    return Array.isArray(lista) ? lista.filter((i): i is string => typeof i === 'string' && validos.has(i)) : []
  } catch {
    return []
  }
}

/** Soma `oponenteId` aos derrotados (idempotente) e persiste; devolve a lista nova. Falha de storage não quebra o jogo. */
export function registrarVitoria(usuarioId: string | undefined, oponenteId: string, atuais: readonly string[], armazenamento: Armazenamento | null = armazenamentoPadrao()): string[] {
  if (atuais.includes(oponenteId) || !OPONENTES.some((o) => o.id === oponenteId)) return [...atuais]
  const novos = [...atuais, oponenteId]
  try {
    armazenamento?.setItem(PREFIXO + (usuarioId ?? 'visitante'), JSON.stringify(novos))
  } catch {
    /* sem persistência: vale só nesta sessão */
  }
  return novos
}

const PREFIXO_LIBERADOS = 'costa-clash:liberados:'

/** Adversários liberados manualmente pela engrenagem (independem de vitórias). */
export function lerLiberados(usuarioId: string | undefined, armazenamento: Armazenamento | null = armazenamentoPadrao()): string[] {
  try {
    const bruto = armazenamento?.getItem(PREFIXO_LIBERADOS + (usuarioId ?? 'visitante'))
    const lista: unknown = bruto ? JSON.parse(bruto) : []
    const validos = new Set(OPONENTES.map((o) => o.id))
    return Array.isArray(lista) ? lista.filter((i): i is string => typeof i === 'string' && validos.has(i)) : []
  } catch {
    return []
  }
}

/** Substitui a lista de liberados manuais (ids inválidos são descartados) e persiste; devolve a lista salva. */
export function salvarLiberados(usuarioId: string | undefined, ids: readonly string[], armazenamento: Armazenamento | null = armazenamentoPadrao()): string[] {
  const validos = new Set(OPONENTES.map((o) => o.id))
  const lista = [...new Set(ids)].filter((i) => validos.has(i))
  try {
    armazenamento?.setItem(PREFIXO_LIBERADOS + (usuarioId ?? 'visitante'), JSON.stringify(lista))
  } catch {
    /* sem persistência: vale só nesta sessão */
  }
  return lista
}
