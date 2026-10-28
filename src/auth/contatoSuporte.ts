// Contato do responsável pelo projeto, configurável em tempo de build (VITE_CONTATO_SUPORTE). Nunca inventamos um contato:
// sem a variável, a orientação é genérica.
export function textoContatoSuporte(valor: string | undefined): string {
  const v = valor?.trim()
  return v ? `Contato do responsável pelo projeto: ${v}` : 'Fale com o responsável pelo projeto pelo mesmo canal em que você recebeu o link do jogo.'
}

export const contatoSuportePadrao: string = textoContatoSuporte(import.meta.env.VITE_CONTATO_SUPORTE)
