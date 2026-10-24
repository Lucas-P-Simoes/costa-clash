// npm run arte:manifesto — regenera/sincroniza public/assets/cards/art/manifest.json e src/arte/indiceArte.json
// preservando estados e hashes existentes. Opções:
//   --check                          só confere se manifesto e índice estão em dia (não grava; sai com 1 se não estiverem)
//   --marcar CC-001,CC-018 --estado provisoria|gerada|rejeitada [--origem "texto"] [--observacao "texto"]   altera o estado (exige arquivo existente)
//   --estado aprovada ... --autorizado-pelo-dono                                    aprovação explícita (nunca automática)
import { existsSync, readFileSync } from 'node:fs'
import { CAMINHOS, serializar, sincronizarPasta } from './arte/manifesto.mjs'
import { contarPorEstado } from '../src/arte/manifesto.ts'

const args = process.argv.slice(2)
const valor = (nome) => {
  const i = args.indexOf(nome)
  return i >= 0 ? args[i + 1] : undefined
}
const check = args.includes('--check')
const marcar = valor('--marcar')?.split(',').map((s) => s.trim().toUpperCase())
const estado = valor('--estado')
const origem = valor('--origem')
const observacao = valor('--observacao')

if (marcar && !['provisoria', 'gerada', 'rejeitada', 'aprovada', 'pendente'].includes(estado ?? '')) {
  console.error('Use --estado provisoria|gerada|rejeitada|aprovada|pendente junto com --marcar.')
  process.exit(2)
}
if (estado === 'aprovada' && !args.includes('--autorizado-pelo-dono')) {
  console.error('Aprovar arte exige --autorizado-pelo-dono (decisão do dono, nunca automática).')
  process.exit(2)
}

let falhou = false
const r = sincronizarPasta({
  escrever: !check,
  ajustes(m, alertas) {
    for (const id of marcar ?? []) {
      const e = m.entradas.find((x) => x.id === id)
      if (!e) {
        alertas.push(`${id}: ID inexistente`)
        falhou = true
        continue
      }
      if (e.estado === 'aprovada' && estado !== 'aprovada') {
        alertas.push(`${id}: arte APROVADA não pode mudar de estado por este script (autorização do dono necessária)`)
        falhou = true
        continue
      }
      if (estado !== 'pendente' && !e.verificacao.sha256) {
        alertas.push(`${id}: sem arquivo; só é possível marcar ${estado} com o arquivo presente`)
        falhou = true
        continue
      }
      e.estado = estado
      if (origem) e.origem = origem
      if (observacao) e.observacao = observacao
    }
  },
})
if (check) {
  const noDisco = existsSync(CAMINHOS.manifesto) ? readFileSync(CAMINHOS.manifesto, 'utf8') : ''
  const indiceDisco = existsSync(CAMINHOS.indice) ? readFileSync(CAMINHOS.indice, 'utf8') : ''
  const ok = noDisco === serializar(r.manifesto) && indiceDisco === serializar(r.indice)
  console.log(ok ? 'Manifesto e índice em dia.' : 'Manifesto/índice DESATUALIZADOS: rode npm run arte:manifesto.')
  process.exit(ok ? 0 : 1)
}
for (const a of r.alertas) console.log('AVISO ' + a)
const c = contarPorEstado(r.manifesto)
console.log(`Manifesto gravado: ${r.manifesto.entradas.length} cartas (${Object.entries(c).map(([k, v]) => `${k}=${v}`).join(', ')}).`)
process.exit(falhou ? 1 : 0)
