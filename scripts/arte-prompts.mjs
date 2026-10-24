// npm run arte:prompts — exporta os prompts em docs/arte (lote-piloto.md, prompts-piloto.json, prompts-catalogo.md/.json).
import { exportarPrompts } from './arte/exportarPrompts.mjs'

const arquivos = exportarPrompts()
console.log('Prompts exportados em docs/arte: ' + arquivos.join(', '))
