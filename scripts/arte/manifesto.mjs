// E/S do manifesto de arte (Node). A lógica pura está em src/arte/manifesto.ts.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promptDaCarta } from '../../src/arte/prompts.ts'
import { gerarIndice, nomeDeArquivo, sincronizarManifesto } from '../../src/arte/manifesto.ts'
import { lerInfoImagem } from './imagem.mjs'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

export const CAMINHOS = {
  raiz: RAIZ,
  catalogo: join(RAIZ, 'src', 'data', 'cartas.json'),
  dirArte: join(RAIZ, 'public', 'assets', 'cards', 'art'),
  manifesto: join(RAIZ, 'public', 'assets', 'cards', 'art', 'manifest.json'),
  indice: join(RAIZ, 'src', 'arte', 'indiceArte.json'),
  docsArte: join(RAIZ, 'docs', 'arte'),
}

export const sha256 = (dados) => createHash('sha256').update(dados).digest('hex')

export function lerCatalogo(caminho = CAMINHOS.catalogo) {
  return JSON.parse(readFileSync(caminho, 'utf8')).cartas
}

/** Cartas com prompt e hash, prontas para o manifesto. */
export function cartasParaManifesto(cartas) {
  return cartas.map((c) => {
    const p = promptDaCarta(c)
    return { id: c.id, nome: c.nome, prompt: p.prompt, promptHash: sha256(p.prompt) }
  })
}

export function lerManifesto(caminho = CAMINHOS.manifesto) {
  return existsSync(caminho) ? JSON.parse(readFileSync(caminho, 'utf8')) : null
}

export const serializar = (obj) => JSON.stringify(obj, null, 2) + '\n'

/** Procura NNN.webp / NNN.png na pasta (webp tem prioridade; duplicados são tratados pelo verificador). */
export function lerArquivosDaPasta(dirArte, cartas) {
  const saida = {}
  if (!existsSync(dirArte)) return saida
  const nomes = new Set(readdirSync(dirArte))
  for (const c of cartas) {
    for (const ext of ['webp', 'png']) {
      const arquivo = nomeDeArquivo(c.id, ext)
      if (!nomes.has(arquivo)) continue
      const dados = readFileSync(join(dirArte, arquivo))
      const info = lerInfoImagem(dados)
      saida[c.id] = { arquivo, largura: info.ok ? info.largura : null, altura: info.ok ? info.altura : null, bytes: dados.length, sha256: sha256(dados) }
      break
    }
  }
  return saida
}

/**
 * Sincroniza o manifesto com o catálogo e a pasta. Com `escrever`, grava manifest.json e o índice do build.
 * @returns {{ manifesto: object, alertas: string[], indice: object }}
 */
export function sincronizarPasta({ dirArte, manifestoPath, indicePath, catalogoPath, escrever = true, ajustes } = {}) {
  const caminhos = {
    dirArte: dirArte ?? CAMINHOS.dirArte,
    manifesto: manifestoPath ?? CAMINHOS.manifesto,
    indice: indicePath ?? CAMINHOS.indice,
    catalogo: catalogoPath ?? CAMINHOS.catalogo,
  }
  const cartas = lerCatalogo(caminhos.catalogo)
  const r = sincronizarManifesto({
    existente: lerManifesto(caminhos.manifesto),
    cartas: cartasParaManifesto(cartas),
    arquivos: lerArquivosDaPasta(caminhos.dirArte, cartas),
  })
  if (ajustes) ajustes(r.manifesto, r.alertas)
  const indice = gerarIndice(r.manifesto)
  if (escrever) {
    mkdirSync(dirname(caminhos.manifesto), { recursive: true })
    writeFileSync(caminhos.manifesto, serializar(r.manifesto))
    mkdirSync(dirname(caminhos.indice), { recursive: true })
    writeFileSync(caminhos.indice, serializar(indice))
  }
  return { manifesto: r.manifesto, alertas: r.alertas, indice }
}
