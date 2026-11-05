import { MolduraOrnamentada } from '../ui/MolduraOrnamentada'

interface Props {
  /** Cartas já descartadas pelo jogador nesta partida. */
  descartadas: number
  /** Classes extras da zona de soltar (zona--drop / zona--sobre durante o arrasto). */
  classeDrop?: string
  /** Texto do botão alternativo (teclado/toque) e se ele pode ser usado agora. */
  podeDescartarSelecionada: boolean
  motivo?: string | null
  onDescartarSelecionada: () => void
}

/** Ícone pixel de lixeira (decorativo). */
function IconeLixeira({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 18" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <rect x="6" y="0" width="4" height="2" fill="#8fa6b4" />
      <rect x="1" y="2" width="14" height="2" fill="#b7cbd6" />
      <rect x="2" y="4" width="12" height="13" fill="#46687a" />
      <rect x="2" y="16" width="12" height="2" fill="#2c4553" />
      <rect x="4" y="6" width="2" height="9" fill="#1f3340" />
      <rect x="7" y="6" width="2" height="9" fill="#1f3340" />
      <rect x="10" y="6" width="2" height="9" fill="#1f3340" />
    </svg>
  )
}

/** Lixeira: solte aqui as cartas da mão para descartá-las. A mão é reposta até 5 no início do seu próximo turno. */
export function Lixeira({ descartadas, classeDrop = '', podeDescartarSelecionada, motivo, onDescartarSelecionada }: Props) {
  return (
    <MolduraOrnamentada as="section" className="duelo-dica duelo-lixeira" aria-label="Lixeira" classeMiolo="duelo-dica__miolo">
      <h2 className="duelo-dica__titulo">
        <IconeLixeira className="duelo-dica__icone" />
        <span>Lixeira</span>
        <strong className="duelo-lixeira__contagem" aria-label={`Cartas descartadas: ${descartadas}`}>
          {descartadas}
        </strong>
      </h2>
      <div className={`duelo-lixeira__zona${classeDrop}`} data-destino="lixeira" aria-dropeffect={classeDrop ? 'move' : undefined}>
        <IconeLixeira className="duelo-lixeira__grande" />
        <p>Arraste aqui as cartas da mão que quiser descartar.</p>
        <small>No próximo turno sua mão volta a ter 5 cartas.</small>
      </div>
      <button
        type="button"
        id="b-lixeira"
        className="duelo-lixeira__botao"
        aria-disabled={!podeDescartarSelecionada || undefined}
        title={motivo ?? undefined}
        onClick={onDescartarSelecionada}
      >
        Jogar selecionada na lixeira
      </button>
    </MolduraOrnamentada>
  )
}
