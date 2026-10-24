// npm run arte:gerar -- --lote piloto | --ids CC-001,CC-018 | --proximos 10 [--executar] [--forcar]
// Padrão: dry-run (imprime prompts, quantidade e custo). Só chama a API com --executar.
// Provedor: ARTE_PROVEDOR=openai (+ OPENAI_API_KEY, ARTE_MODELO, ARTE_TAMANHO, ARTE_CUSTO_UNITARIO_USD). NÃO foi executado pelo DEV.
import { executarGeracao } from './arte/gerar.mjs'

try {
  const r = await executarGeracao({ argv: process.argv.slice(2) })
  process.exit(r.falhas.length ? 1 : 0)
} catch (e) {
  console.error('ERRO: ' + (e instanceof Error ? e.message : e))
  process.exit(2)
}
