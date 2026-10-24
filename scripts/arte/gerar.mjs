// Núcleo do gerador de arte (testável). O CLI é scripts/gerar-arte.mjs.
// Padrão: --dry-run (só imprime). Só chama o provedor com --executar. Nunca toca em arte 'aprovada';
// nunca sobrescreve arquivo existente sem --forcar.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { IDS_PILOTO } from '../../src/arte/piloto.ts'
import { nomeDeArquivo } from '../../src/arte/manifesto.ts'
import { lerInfoImagem } from './imagem.mjs'
import { CAMINHOS, lerManifesto, sha256, sincronizarPasta } from './manifesto.mjs'
import { LIMITES } from './verificar.mjs'
import { obterProvedor, variaveisAusentes, PROVEDORES } from './provedores.mjs'

export function lerArgumentos(argv) {
  const o = { executar: false, forcar: false, lote: null, ids: null, proximos: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--executar') o.executar = true
    else if (a === '--dry-run') o.executar = false
    else if (a === '--forcar') o.forcar = true
    else if (a === '--lote') o.lote = argv[++i]
    else if (a === '--ids') o.ids = String(argv[++i] ?? '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
    else if (a === '--proximos') o.proximos = Number(argv[++i])
    else throw new Error(`Argumento desconhecido: ${a}`)
  }
  const escolhas = [o.lote, o.ids, o.proximos].filter((x) => x !== null && x !== undefined).length
  if (escolhas !== 1) throw new Error('Informe exatamente um entre --lote piloto, --ids CC-001,CC-018 ou --proximos N.')
  if (o.lote !== null && o.lote !== 'piloto') throw new Error(`Lote desconhecido: ${o.lote} (disponível: piloto).`)
  if (o.proximos !== null && (!Number.isInteger(o.proximos) || o.proximos < 1)) throw new Error('--proximos exige um inteiro >= 1.')
  return o
}

/** Escolhe as cartas do lote e decide quais serão geradas e quais puladas (com o motivo). */
export function planejar({ manifesto, opcoes, dirArte }) {
  const porId = new Map(manifesto.entradas.map((e) => [e.id, e]))
  let ids
  if (opcoes.lote === 'piloto') ids = [...IDS_PILOTO]
  else if (opcoes.ids) ids = opcoes.ids
  else ids = manifesto.entradas.filter((e) => e.estado === 'pendente').slice(0, opcoes.proximos).map((e) => e.id)
  const gerar = []
  const puladas = []
  for (const id of ids) {
    const e = porId.get(id)
    if (!e) {
      puladas.push({ id, motivo: 'ID inexistente no manifesto' })
      continue
    }
    if (e.estado === 'aprovada') puladas.push({ id, motivo: 'arte APROVADA nunca é regenerada (peça autorização ao dono e remova a aprovação manualmente)' })
    else if (e.estado !== 'pendente' && !opcoes.forcar) puladas.push({ id, motivo: `estado ${e.estado}; use --forcar para regenerar` })
    else if (e.estado === 'pendente' && !opcoes.forcar && ['webp', 'png'].some((x) => existsSync(join(dirArte, nomeDeArquivo(id, x))))) puladas.push({ id, motivo: 'já existe arquivo; use --forcar para sobrescrever' })
    else gerar.push(e)
  }
  return { gerar, puladas }
}

/**
 * Executa (ou simula) a geração.
 * @param {{ argv: string[], env?: object, log?: (s: string) => void, caminhos?: object, provedores?: object, fetch?: Function }} p
 */
export async function executarGeracao({ argv, env = process.env, log = console.log, caminhos = {}, provedores = PROVEDORES, fetch: f }) {
  const opcoes = lerArgumentos(argv)
  const C = { ...CAMINHOS, ...caminhos }
  const manifesto = lerManifesto(C.manifesto)
  if (!manifesto) throw new Error('Manifesto ausente: rode npm run arte:manifesto antes.')
  const { gerar, puladas } = planejar({ manifesto, opcoes, dirArte: C.dirArte })
  const resultado = { modo: opcoes.executar ? 'executar' : 'dry-run', selecionadas: gerar.map((e) => e.id), puladas, geradas: [], falhas: [], chamadas: 0 }

  log(`Modo: ${resultado.modo}. A gerar: ${gerar.length}. Puladas: ${puladas.length}.`)
  for (const p of puladas) log(`  pulada ${p.id}: ${p.motivo}`)

  const nomeProvedor = env.ARTE_PROVEDOR
  let provedor = null
  if (nomeProvedor) provedor = obterProvedor(nomeProvedor, provedores)
  const custoUnit = provedor?.custoPorImagem?.(env) ?? null
  if (!opcoes.executar) {
    for (const e of gerar) log(`\n[${e.id}] ${e.nome} -> ${e.arquivo}\n${e.prompt}`)
    log(`\nQuantidade: ${gerar.length} imagem(ns). Custo estimado: ${custoUnit === null ? 'desconhecido (defina ARTE_PROVEDOR e ARTE_CUSTO_UNITARIO_USD)' : `US$ ${(custoUnit * gerar.length).toFixed(2)}`}.`)
    log('Dry-run: nenhuma API foi chamada e nenhum arquivo foi criado. Use --executar para gerar de verdade.')
    return resultado
  }

  provedor = obterProvedor(nomeProvedor, provedores)
  const faltam = variaveisAusentes(provedor, env)
  if (faltam.length) throw new Error(`Variáveis de ambiente ausentes para ${provedor.id}: ${faltam.join(', ')}.`)
  mkdirSync(C.dirArte, { recursive: true })
  const registros = []
  for (const e of gerar) {
    try {
      resultado.chamadas++
      const { bytes, modelo } = await provedor.gerar({ prompt: e.prompt, env, fetch: f })
      const info = lerInfoImagem(bytes)
      if (!info.ok) throw new Error(`imagem inválida: ${info.erro}`)
      if (Math.abs(info.largura / info.altura - 3 / 4) > LIMITES.tolerancia34) throw new Error(`proporção ${info.largura}x${info.altura} não é 3:4; arte recusada (não salva)`)
      if (info.largura < LIMITES.larguraMinima || info.altura < LIMITES.alturaMinima) throw new Error(`resolução ${info.largura}x${info.altura} abaixo do mínimo; arte recusada (não salva)`)
      const arquivo = nomeDeArquivo(e.id, info.formato)
      // Se existia o outro formato (forçado), remove-o do caminho: o verificador acusaria duplicidade.
      writeFileSync(join(C.dirArte, arquivo), bytes)
      registros.push({ id: e.id, arquivo, modelo, sha256: sha256(bytes), promptHash: e.promptHash })
      resultado.geradas.push(e.id)
      log(`  gerada ${e.id} -> ${arquivo} (${info.largura}x${info.altura}, ${bytes.length} bytes)`)
    } catch (erro) {
      resultado.falhas.push({ id: e.id, erro: erro instanceof Error ? erro.message : String(erro) })
      log(`  FALHA ${e.id}: ${erro instanceof Error ? erro.message : erro}`)
    }
  }
  // Atualiza o manifesto: estado 'gerada' (nunca 'aprovada'), hash do prompt usado e origem.
  sincronizarPasta({
    dirArte: C.dirArte,
    manifestoPath: C.manifesto,
    indicePath: C.indice,
    catalogoPath: C.catalogo,
    ajustes(m) {
      for (const r of registros) {
        const e = m.entradas.find((x) => x.id === r.id)
        e.estado = 'gerada'
        e.promptHashGerado = r.promptHash
        e.origem = `gerada via ${provedor.id} (${r.modelo})`
      }
    },
  })
  log(`Concluído: ${resultado.geradas.length} gerada(s), ${resultado.falhas.length} falha(s). Revise e rode npm run arte:verificar.`)
  return resultado
}
