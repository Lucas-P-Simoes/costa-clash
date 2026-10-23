// Gerador de estatísticas IA x IA. Só roda com a variável STATS=1 (não faz parte da suíte normal):
//   STATS=1 npx vitest run src/game/__tests__/estatisticas.test.ts
import { describe, it } from 'vitest'
import { BARALHOS_SIMULACAO, simularIAxIA } from './simular'

describe('estatísticas IA x IA (manual)', () => {
  it.runIf(import.meta.env['STATS'])('todas as combinações ordenadas de 17 baralhos, 2 seeds cada', () => {
    const t0 = Date.now()
    const res = { primeiro: 0, segundo: 0, empate: 0 }
    const motivos: Record<string, number> = {}
    const turnos: number[] = []
    const porBaralho: Record<string, { jogos: number; vitorias: number; empates: number }> = {}
    let fallbacks = 0
    let violacoes = 0
    let jogos = 0
    for (const a of BARALHOS_SIMULACAO) {
      for (const b of BARALHOS_SIMULACAO) {
        for (let s = 0; s < 2; s++) {
          const r = simularIAxIA(a.ids, b.ids, 5000 + jogos)
          jogos++
          fallbacks += r.fallbacks
          violacoes += r.violacoes.length
          turnos.push(r.turnos)
          motivos[r.motivo as string] = (motivos[r.motivo as string] ?? 0) + 1
          for (const [nome, lado] of [[a.nome, 'humano'], [b.nome, 'oponente']] as const) {
            const p = (porBaralho[nome] ??= { jogos: 0, vitorias: 0, empates: 0 })
            p.jogos++
            if (r.vencedor === lado) p.vitorias++
            else if (r.vencedor === null) p.empates++
          }
          if (r.vencedor === 'humano') res.primeiro++
          else if (r.vencedor === 'oponente') res.segundo++
          else res.empate++
        }
      }
    }
    turnos.sort((x, y) => x - y)
    const media = turnos.reduce((s, x) => s + x, 0) / turnos.length
    const ms = Date.now() - t0
    console.log(
      JSON.stringify(
        {
          jogos,
          res,
          motivos,
          turnos: { min: turnos[0], mediana: turnos[Math.floor(turnos.length / 2)], media: Number(media.toFixed(1)), max: turnos.at(-1) },
          fallbacks,
          violacoes,
          ms,
          msPorPartida: Number((ms / jogos).toFixed(1)),
          porBaralho: Object.fromEntries(Object.entries(porBaralho).map(([k, v]) => [k, `${v.vitorias}/${v.jogos} (${((100 * v.vitorias) / v.jogos).toFixed(0)}%) emp ${v.empates}`])),
        },
        null,
        1,
      ),
    )
  }, 120000)
})
