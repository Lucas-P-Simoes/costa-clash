// Exporta os prompts (JSON e Markdown). Determinístico: mesma entrada, mesmos bytes.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CRITERIOS_GERAIS, PILOTO, VARIACOES_SUGERIDAS } from '../../src/arte/piloto.ts'
import { FRASE_FINAL, promptDaCarta, seedsSugeridas } from '../../src/arte/prompts.ts'
import { baseDoArquivo } from '../../src/arte/prompts.ts'
import { CAMINHOS, lerCatalogo, serializar } from './manifesto.mjs'

const AVISO =
  'AVISO: nenhuma ilustração final foi gerada. Este arquivo contém apenas prompts para o dono (ou um serviço autorizado) gerar as imagens. Tamanho final desejado: 768x1024 (3:4), PNG ou WebP, sem texto, moldura, selo nem ATK/DEF.'

export function dadosPiloto(cartas) {
  return PILOTO.map((p) => {
    const c = cartas.find((x) => x.id === p.id)
    const d = promptDaCarta(c)
    return {
      id: c.id,
      nome: c.nome,
      categoria: p.categoria,
      paleta: { id: d.paleta, rotulo: d.paletaRotulo },
      forma: d.forma,
      arquivoEsperado: `${baseDoArquivo(c.id)}.webp`,
      tamanhoFinal: '768x1024',
      prompt: d.prompt,
      promptEn: d.promptEn,
      fraseFinalObrigatoria: FRASE_FINAL.pt,
      seedsSugeridas: seedsSugeridas(c.id),
      variacoes: VARIACOES_SUGERIDAS,
      criteriosEspecificos: p.criterios,
    }
  })
}

export function markdownPiloto(cartas) {
  const L = [
    '# Lote piloto de ilustrações (5 cartas)',
    '',
    `> ${AVISO}`,
    '',
    'Gerado por `npm run arte:prompts` (não editar à mão). Versão legível por máquina: `docs/arte/prompts-piloto.json`.',
    '',
    'Como usar: cole o prompt (português ou inglês) em qualquer gerador (ChatGPT/gpt-image, Midjourney, Stable Diffusion, Gemini, Ideogram...). Peça imagem vertical 3:4. Se o gerador só oferecer outras proporções, gere na mais próxima e informe: o projeto exige 3:4 final. Depois salve como `NNN.webp` ou `NNN.png` em `public/assets/cards/art/` e rode `npm run arte:manifesto` e `npm run arte:verificar`.',
    '',
    'Seeds valem para geradores que aceitam seed (Stable Diffusion, Midjourney `--seed`); gpt-image, Gemini e Ideogram não garantem reprodução por seed.',
    '',
  ]
  for (const d of dadosPiloto(cartas)) {
    L.push(`## ${d.id} — ${d.nome}`, '')
    L.push(`- Categoria: ${d.categoria}`, `- Paleta: ${d.paleta.rotulo}`, `- Forma de composição: ${d.forma}`, `- Arquivo esperado: \`${d.arquivoEsperado}\` (${d.tamanhoFinal})`)
    L.push(`- Seeds sugeridas: ${d.seedsSugeridas.join(', ')}`, '')
    L.push('Prompt (português, canônico):', '', '```text', d.prompt, '```', '', 'Prompt (inglês):', '', '```text', d.promptEn, '```', '')
    L.push('Variações sugeridas:', ...d.variacoes.map((v) => `- ${v}`), '')
    L.push('Critérios de aprovação visual (específicos):', ...d.criteriosEspecificos.map((v) => `- [ ] ${v}`), '')
  }
  L.push('## Critérios gerais (todas as cartas)', '', ...CRITERIOS_GERAIS.map((v) => `- [ ] ${v}`), '')
  return L.join('\n')
}

export function dadosCatalogo(cartas) {
  return cartas.map((c) => {
    const d = promptDaCarta(c)
    return { id: c.id, nome: c.nome, arquivoEsperado: `${baseDoArquivo(c.id)}.webp`, paleta: d.paleta, forma: d.forma, prompt: d.prompt, promptEn: d.promptEn }
  })
}

export function markdownCatalogo(cartas) {
  const L = ['# Prompts das 100 cartas', '', `> ${AVISO}`, '', 'Gerado por `npm run arte:prompts` (não editar à mão).', '']
  for (const d of dadosCatalogo(cartas)) L.push(`## ${d.id} — ${d.nome}`, '', `Arquivo: \`${d.arquivoEsperado}\` | Paleta: ${d.paleta} | Forma: ${d.forma}`, '', '```text', d.prompt, '```', '')
  return L.join('\n')
}

/** Grava os 4 arquivos em docs/arte (ou em `destino`). */
export function exportarPrompts({ destino = CAMINHOS.docsArte, catalogoPath } = {}) {
  const cartas = lerCatalogo(catalogoPath)
  mkdirSync(destino, { recursive: true })
  const arquivos = {
    'prompts-piloto.json': serializar({ aviso: AVISO, cartas: dadosPiloto(cartas) }),
    'lote-piloto.md': markdownPiloto(cartas) + '\n',
    'prompts-catalogo.json': serializar({ aviso: AVISO, cartas: dadosCatalogo(cartas) }),
    'prompts-catalogo.md': markdownCatalogo(cartas) + '\n',
  }
  for (const [nome, conteudo] of Object.entries(arquivos)) writeFileSync(join(destino, nome), conteudo)
  return Object.keys(arquivos)
}
