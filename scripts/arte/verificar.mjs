// Verificador das ilustrações (Node). Com 0 imagens passa e relata 100 pendentes.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { lerInfoImagem } from './imagem.mjs'
import { sha256 } from './manifesto.mjs'

export const LIMITES = {
  larguraPreferencial: 768,
  alturaPreferencial: 1024,
  larguraMinima: 384,
  alturaMinima: 512,
  larguraMaxima: 3072,
  tolerancia34: 0.01,
  bytesAviso: 1.5 * 1024 * 1024,
  bytesMaximo: 5 * 1024 * 1024,
  bytesMinimo: 100,
}

const NOME_VALIDO = /^(\d{3})\.(webp|png)$/
const EXTENSOES_IMAGEM = /\.(png|webp|jpe?g|gif|bmp|avif|svg)$/i

/**
 * @param {{ diretorio: string, manifesto: object, limites?: Partial<typeof LIMITES> }} opcoes
 * @returns {{ ok: boolean, erros: string[], avisos: string[], contagem: Record<string, number>, pendentes: number, total: number, arquivos: number }}
 */
export function verificarArte({ diretorio, manifesto, limites }) {
  const L = { ...LIMITES, ...limites }
  const erros = []
  const avisos = []
  const entradas = manifesto?.entradas ?? []
  const porNumero = new Map(entradas.map((e) => [e.id.slice(3), e]))
  const contagem = { pendente: 0, provisoria: 0, gerada: 0, aprovada: 0, rejeitada: 0 }
  for (const e of entradas) contagem[e.estado] = (contagem[e.estado] ?? 0) + 1

  const nomes = existsSync(diretorio) ? readdirSync(diretorio).filter((n) => EXTENSOES_IMAGEM.test(n)).sort() : []
  const vistosHash = new Map()
  const arquivosPorId = new Map()

  for (const nome of nomes) {
    const m = NOME_VALIDO.exec(nome)
    if (!m) {
      erros.push(`${nome}: nome inválido (use NNN.webp ou NNN.png com NNN = número do ID)`)
      continue
    }
    const entrada = porNumero.get(m[1])
    if (!entrada) {
      erros.push(`${nome}: não corresponde a nenhum ID do catálogo (CC-${m[1]})`)
      continue
    }
    arquivosPorId.set(entrada.id, [...(arquivosPorId.get(entrada.id) ?? []), nome])
    const dados = readFileSync(join(diretorio, nome))
    const info = lerInfoImagem(dados)
    const provisoria = entrada.estado === 'provisoria'
    // Em provisoria, problemas de resolução/proporção viram avisos; arquivo inválido continua sendo erro.
    const aviso = (msg) => (provisoria ? avisos : erros).push(`${nome}: ${msg}${provisoria ? ' (provisória: apenas aviso)' : ''}`)
    if (!info.ok) {
      erros.push(`${nome}: ${info.erro}`)
      continue
    }
    if (info.formato !== m[2]) erros.push(`${nome}: extensão .${m[2]} mas o conteúdo é ${info.formato.toUpperCase()}`)
    const razao = info.largura / info.altura
    if (Math.abs(razao - 3 / 4) > L.tolerancia34) aviso(`proporção ${info.largura}x${info.altura} (${razao.toFixed(3)}) fora de 3:4`)
    if (info.largura < L.larguraMinima || info.altura < L.alturaMinima) aviso(`resolução ${info.largura}x${info.altura} abaixo do mínimo ${L.larguraMinima}x${L.alturaMinima}`)
    else if (info.largura > L.larguraMaxima) aviso(`largura ${info.largura} acima do máximo ${L.larguraMaxima}`)
    else if (info.largura !== L.larguraPreferencial || info.altura !== L.alturaPreferencial) avisos.push(`${nome}: dimensão ${info.largura}x${info.altura} difere da preferencial ${L.larguraPreferencial}x${L.alturaPreferencial}`)
    if (dados.length < L.bytesMinimo) erros.push(`${nome}: arquivo pequeno demais (${dados.length} bytes)`)
    else if (dados.length > L.bytesMaximo) erros.push(`${nome}: arquivo grande demais (${dados.length} bytes; máximo ${L.bytesMaximo})`)
    else if (dados.length > L.bytesAviso) avisos.push(`${nome}: arquivo grande (${dados.length} bytes); considere comprimir`)
    const h = sha256(dados)
    if (vistosHash.has(h)) erros.push(`${nome}: duplicado de ${vistosHash.get(h)} (mesmo sha256)`)
    else vistosHash.set(h, nome)

    // Coerência com o manifesto.
    if (entrada.estado === 'pendente' || entrada.estado === 'rejeitada') avisos.push(`${nome}: manifesto marca ${entrada.id} como ${entrada.estado}; rode npm run arte:manifesto`)
    else if (entrada.verificacao?.sha256 && entrada.verificacao.sha256 !== h) {
      const msg = `${nome}: sha256 difere do manifesto`
      if (entrada.estado === 'aprovada') erros.push(`${msg} — arte APROVADA foi alterada sem autorização`)
      else avisos.push(`${msg}; rode npm run arte:manifesto`)
    }
  }

  for (const [id, lista] of arquivosPorId) if (lista.length > 1) erros.push(`${id}: mais de um arquivo (${lista.join(', ')})`)

  for (const e of entradas) {
    if (!arquivosPorId.has(e.id) && (e.estado === 'provisoria' || e.estado === 'gerada' || e.estado === 'aprovada'))
      erros.push(`${e.id}: estado ${e.estado} mas o arquivo ${e.arquivo} não existe`)
    if (e.promptHashGerado && e.promptHashGerado !== e.promptHash && (e.estado === 'gerada' || e.estado === 'aprovada'))
      avisos.push(`${e.id}: o prompt mudou depois da geração (revise a arte)`)
    if (e.estado === 'provisoria' && !e.origem) avisos.push(`${e.id}: provisória sem campo origem`)
  }

  return { ok: erros.length === 0, erros, avisos, contagem, pendentes: contagem.pendente, total: entradas.length, arquivos: nomes.length }
}

export function formatarRelatorio(r) {
  const linhas = []
  linhas.push(`Ilustrações: ${r.total} cartas no manifesto, ${r.arquivos} arquivo(s) de imagem.`)
  linhas.push(`Estados: ${Object.entries(r.contagem).map(([k, v]) => `${k}=${v}`).join(', ')}.`)
  linhas.push(`${r.pendentes} pendente(s) (sem arte).`)
  for (const a of r.avisos) linhas.push(`AVISO  ${a}`)
  for (const e of r.erros) linhas.push(`ERRO   ${e}`)
  linhas.push(r.ok ? 'Resultado: OK.' : `Resultado: FALHOU (${r.erros.length} erro(s)).`)
  return linhas.join('\n')
}
