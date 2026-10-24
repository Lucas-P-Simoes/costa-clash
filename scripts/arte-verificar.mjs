// npm run arte:verificar — confere as imagens em public/assets/cards/art/. Com 0 imagens passa (100 pendentes).
import { CAMINHOS, lerManifesto } from './arte/manifesto.mjs'
import { formatarRelatorio, verificarArte } from './arte/verificar.mjs'

const manifesto = lerManifesto()
if (!manifesto) {
  console.error('Manifesto ausente: rode npm run arte:manifesto.')
  process.exit(1)
}
const r = verificarArte({ diretorio: CAMINHOS.dirArte, manifesto })
console.log(formatarRelatorio(r))
process.exit(r.ok ? 0 : 1)
