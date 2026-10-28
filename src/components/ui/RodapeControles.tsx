import { OrnamentoOnda } from './Icones'

/** Rodapé com a frase de marca e o ornamento de onda. */
export function RodapeControles({ inert }: { inert?: boolean }) {
  return (
    <footer className="rodape textura-pedra" inert={inert || undefined}>
      <p className="rodape__frase">
        Conhecimento também protege os nossos mares.
        <OrnamentoOnda />
      </p>
    </footer>
  )
}
