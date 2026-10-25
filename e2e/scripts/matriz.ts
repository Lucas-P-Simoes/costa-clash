// Gera a matriz tela x viewport (medições + capturas). Uso (servidor de desenvolvimento rodando, ver docs/TESTING.md):
//   node e2e/scripts/matriz.ts --out <pasta> [--vps nominais|efetivas|zoom|todas|e2e|<lista 1920x1080,...>] [--cenas login,duelo,...] [--shots 1920x1080,...]
// Não faz parte do `npm test` nem do `npm run test:e2e`; serve para diagnóstico e para preencher a tabela da documentação.
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { abrirCena, CENAS } from '../lib/cenas.ts'
import type { Cena } from '../lib/cenas.ts'
import { verificarCliquesAcoes } from '../lib/cliques.ts'
import { medirNaPagina } from '../lib/medir.ts'
import type { Medicao } from '../lib/medir.ts'
import { EFETIVAS, exigeSemRolagem, MATRIZ_COMPLETA, NOMINAIS, SUBCONJUNTO_E2E, ZOOM } from '../lib/viewports.ts'
import type { Viewport } from '../lib/viewports.ts'

const args = new Map<string, string>()
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i]!.replace(/^--/, ''), process.argv[i + 1] ?? '')
const out = args.get('out') ?? 'matriz-out'
const MIN_FONTE = Number(args.get('minfonte') ?? 11)
mkdirSync(out, { recursive: true })

function escolherVps(): Viewport[] {
  const q = args.get('vps') ?? 'todas'
  if (q === 'nominais') return NOMINAIS
  if (q === 'efetivas') return EFETIVAS
  if (q === 'zoom') return ZOOM
  if (q === 'e2e') return SUBCONJUNTO_E2E
  if (q === 'todas') return MATRIZ_COMPLETA
  return q.split(',').map((s) => {
    const m = /^(\d+)x(\d+)(?:@([\d.]+))?(t)?$/.exec(s)!
    const w = Number(m[1])
    const dpr = m[3] ? Number(m[3]) : undefined
    return { nome: s.replace(/t$/, ''), w, h: Number(m[2]), dpr, toque: !!m[4] || w < 800 } as Viewport
  })
}
const cenas = (args.get('cenas') ? args.get('cenas')!.split(',') : CENAS) as Cena[]
const shots = new Set((args.get('shots') ?? '').split(',').filter(Boolean))

type Status = 'OK' | 'rolagem interna' | 'rolagem natural' | 'adaptado' | 'FALHA'
interface Linha {
  cena: Cena
  vp: string
  status: Status
  motivos: string[]
  m: Medicao
}

function avaliar(cena: Cena, v: Viewport, m: Medicao, extra: string[]): { status: Status; motivos: string[] } {
  const motivos: string[] = []
  // ?arte=1 é uma página de avaliação longa (galeria de prompts): rolagem vertical natural por projeto
  const desktop = exigeSemRolagem(v) && cena !== 'arte'
  if (m.excessoH > 0) motivos.push(`rolagem horizontal +${m.excessoH}px`)
  if (desktop && m.excessoV > 0) motivos.push(`rolagem vertical +${m.excessoV}px`)
  const fora = m.foraDaViewport.filter((f) => desktop || f.l < -0.5 || f.r > m.vw + 0.5)
  if (fora.length) motivos.push(`fora da viewport: ${fora.slice(0, 4).map((f) => `${f.seletor}(${f.texto})`).join('; ')}${fora.length > 4 ? ` +${fora.length - 4}` : ''}`)
  if (m.sobreposicoes.length) motivos.push(`sobreposição: ${m.sobreposicoes.slice(0, 3).join('; ')}`)
  if (m.fontesPequenas.length) motivos.push(`fonte <${MIN_FONTE}px: ${m.fontesPequenas.slice(0, 4).map((f) => `${f.seletor}=${f.px}`).join('; ')}`)
  if (m.coarse && m.alvosPequenos.length) motivos.push(`alvo <44px: ${m.alvosPequenos.slice(0, 4).map((f) => `${f.texto}(${f.w}x${f.h})`).join('; ')}`)
  if (m.cartasFora34.length) motivos.push(`carta fora de 3:4: ${m.cartasFora34.slice(0, 3).map((c) => `${c.seletor}=${c.razao}`).join('; ')}`)
  if (m.imagensDistorcidas.length) motivos.push(`imagem distorcida: ${m.imagensDistorcidas.map((i) => i.src).join(',')}`)
  if (m.atributosCortados.length) motivos.push('ATK/DEF cortados: ' + m.atributosCortados.slice(0, 3).join('; '))
  if (m.problemasMao.length) motivos.push('mão: ' + m.problemasMao.slice(0, 3).join('; '))
  if (m.rotulosPequenos.length) motivos.push('rótulo ATK/DEF < 10px: ' + m.rotulosPequenos[0]!.px)
  if (extra.length) motivos.push(...extra)
  const baixo = desktop && v.h <= 680
  const soNomes = m.textoCortado.every((t) => /carta__(nome|efeito)/.test(t))
  if (m.textoCortado.length && !(baixo && soNomes)) motivos.push(`texto cortado: ${m.textoCortado.slice(0, 3).join('; ')}`)
  if (motivos.length) return { status: 'FALHA', motivos }
  if (!desktop && m.excessoV > 0) return { status: 'rolagem natural', motivos }
  if (m.textoCortado.length) return { status: 'adaptado', motivos: ['nomes/efeitos de cartas truncados (altura muito baixa; texto completo no tooltip, rótulo acessível e dica)'] }
  if (m.rolagemInterna.length) return { status: 'rolagem interna', motivos: [m.rolagemInterna.join('; ')] }
  return { status: 'OK', motivos }
}

const browser = await chromium.launch({ channel: 'chrome' })
const linhas: Linha[] = []
for (const v of escolherVps()) {
  const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: v.dpr ?? 1, isMobile: !!v.toque && v.w < 800, hasTouch: !!v.toque })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.error('pageerror', e.message))
  for (const cena of cenas) {
    try {
      await abrirCena(page, cena)
      const m = await page.evaluate(medirNaPagina, MIN_FONTE)
      const extra: string[] = []
      if (cena === 'duelo' || cena === 'dueloCampo') for (const r of await verificarCliquesAcoes(page)) if (r.cobertoEm.length || !r.alcancavel) extra.push('clique ' + r.botao + ' ' + (r.alcancavel ? 'coberto por ' + r.cobertoEm[0]!.por : 'inalcançável'))
      const { status, motivos } = avaliar(cena, v, m, extra)
      linhas.push({ cena, vp: v.nome, status, motivos, m })
      if (shots.has(v.nome)) await page.screenshot({ path: `${out}/${cena}_${v.nome}.png` })
      console.log(`${v.nome.padEnd(14)} ${cena.padEnd(17)} ${status}${motivos.length ? '  ' + motivos.join(' | ') : ''}`)
    } catch (e) {
      const m = { vw: v.w, vh: v.h } as Medicao
      linhas.push({ cena, vp: v.nome, status: 'FALHA', motivos: ['erro: ' + String(e).slice(0, 160)], m })
      console.log(`${v.nome.padEnd(14)} ${cena.padEnd(17)} ERRO ${String(e).slice(0, 160)}`)
    }
  }
  await ctx.close()
}
await browser.close()

writeFileSync(`${out}/matriz.json`, JSON.stringify(linhas, null, 1))
const vpsUsados = [...new Set(linhas.map((l) => l.vp))]
const sigla: Record<Status, string> = { OK: 'OK', 'rolagem interna': 'RI', 'rolagem natural': 'RN', adaptado: 'AD', FALHA: 'FALHA' }
const tabela = [`| tela \\ viewport | ${vpsUsados.join(' | ')} |`, `|---|${vpsUsados.map(() => '---').join('|')}|`]
for (const c of cenas) tabela.push(`| ${c} | ${vpsUsados.map((n) => sigla[linhas.find((l) => l.cena === c && l.vp === n)?.status ?? 'FALHA']).join(' | ')} |`)
writeFileSync(`${out}/matriz.md`, tabela.join('\n') + '\n')
const falhas = linhas.filter((l) => l.status === 'FALHA').length
console.log(`\n${linhas.length} medições, ${falhas} falhas. Saída em ${out}`)
