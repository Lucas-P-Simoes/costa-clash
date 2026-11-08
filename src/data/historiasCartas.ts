// As 70 cartas atuais usam o texto educacional e os campos informativos importados da planilha.
// O mapa permanece para compatibilidade com a UI e poderá receber histórias editoriais futuras.
export const HISTORIAS_CARTAS: Readonly<Record<string, string>> = {}

export function historiaDaCarta(id: string): string | undefined {
  return HISTORIAS_CARTAS[id]
}
