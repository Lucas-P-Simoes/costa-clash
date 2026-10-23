import { IconeBotaoO, IconeBotaoX, IconeDpad, OrnamentoOnda } from './Icones'

/** Rodapé com dicas de controle (decorativas) e a frase de marca. */
export function RodapeControles() {
  return (
    <footer className="rodape textura-pedra">
      <ul className="rodape__controles" aria-label="Controles do jogo">
        <li>
          <IconeDpad /> Selecionar
        </li>
        <li>
          <IconeBotaoX /> Confirmar
        </li>
        <li>
          <IconeBotaoO /> Voltar
        </li>
      </ul>
      <p className="rodape__frase">
        Conhecimento também protege os nossos mares.
        <OrnamentoOnda />
      </p>
    </footer>
  )
}
