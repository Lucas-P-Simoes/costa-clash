// As 70 cartas atuais derivam seus sujeitos visuais dos metadados informativos do catálogo.

export type PaletaId = 'ecossistema' | 'vidaMarinha' | 'impacto' | 'fenomeno' | 'solucao' | 'comunidade' | 'urbano'

/** Forma de composição do assunto principal (define o texto de enquadramento). */
export type Forma = 'criatura' | 'cena' | 'objeto' | 'paisagem' | 'personagem' | 'simbolo'

export interface Sujeito {
  forma: Forma
  paleta: PaletaId
  pt: string
  en: string
}

/** Exceções editoriais por ID; vazio porque o catálogo atual é descrito pela planilha. */
export const SUJEITOS: Readonly<Record<string, Sujeito>> = {}
