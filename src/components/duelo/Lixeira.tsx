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

/** Ícone pixel do incinerador de descarte (decorativo). */
function IconeIncinerador({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <path fill="#153e50" d="M3 5h18v17H3z" />
      <path fill="#68d9ea" d="M2 3h20v3H2zM5 1h14v2H5zM5 20h14v2H5z" />
      <path fill="#08202d" d="M6 8h12v9H6z" />
      <path fill="#174e61" d="M8 10h8v5H8z" />
      <path fill="#ffcf4b" d="M10 14h4v2h-4z" />
      <path fill="#ff6b24" d="M11 11h2v4h-2zM9 13h2v2H9zM13 12h2v3h-2z" />
      <path fill="#c8f7ff" d="M4 4h2v1H4zM18 4h2v1h-2z" />
    </svg>
  )
}

function IconeSetaDescarte() {
  return (
    <svg viewBox="0 0 18 18" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M7 1h4v8h4l-6 6-6-6h4z" />
      <path fill="#07141e" d="M5 15h8v2H5z" />
    </svg>
  )
}

/** Lixeira: solte aqui as cartas da mão para descartá-las. A mão é reposta até 5 no início do seu próximo turno. */
export function Lixeira({ descartadas, classeDrop = '', podeDescartarSelecionada, motivo, onDescartarSelecionada }: Props) {
  const sobre = classeDrop.includes('zona--sobre')
  const pronta = classeDrop.includes('zona--drop')
  const estado = sobre ? 'sobre' : pronta ? 'pronta' : 'repouso'

  return (
    <MolduraOrnamentada as="section" className="duelo-dica duelo-lixeira" aria-label="Lixeira" classeMiolo="duelo-dica__miolo duelo-lixeira__miolo">
      <h2 className="duelo-dica__titulo duelo-lixeira__titulo">
        <span className="duelo-lixeira__selo" aria-hidden="true">
          <IconeIncinerador className="duelo-dica__icone" />
        </span>
        <span className="duelo-lixeira__titulo-texto">
          <span>Lixeira</span>
          <small>Câmara de descarte</small>
        </span>
        <strong className="duelo-lixeira__contagem" aria-label={`Cartas descartadas: ${descartadas}`}>
          <small>Descartadas</small>
          <span>{descartadas}</span>
        </strong>
      </h2>
      <div className={`duelo-lixeira__zona${classeDrop}`} data-destino="lixeira" data-estado={estado} aria-dropeffect={pronta ? 'move' : undefined}>
        <span className="duelo-lixeira__maquina" aria-hidden="true">
          <span className="duelo-lixeira__trilho duelo-lixeira__trilho--esq" />
          <span className="duelo-lixeira__trilho duelo-lixeira__trilho--dir" />
          <span className="duelo-lixeira__painel">
            <i />
            <i />
            <i />
          </span>
          <span className="duelo-lixeira__boca">
            <span className="duelo-lixeira__tampa" />
            <span className="duelo-lixeira__fogo">
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
            <span className="duelo-lixeira__grade" />
          </span>
          <span className="duelo-lixeira__base" />
        </span>
        <span className="duelo-lixeira__instrucao">
          <strong>{sobre ? 'Solte para incinerar' : pronta ? 'Destino de descarte pronto' : 'Arraste uma carta para a câmara'}</strong>
          <small>No próximo turno, sua mão tenta voltar a 5 cartas.</small>
        </span>
      </div>
      <button
        type="button"
        id="b-lixeira"
        className="duelo-lixeira__botao"
        aria-disabled={!podeDescartarSelecionada || undefined}
        title={motivo ?? undefined}
        onClick={onDescartarSelecionada}
      >
        <span className="duelo-lixeira__botao-icone" aria-hidden="true">
          <IconeSetaDescarte />
        </span>
        <span>Descartar carta selecionada</span>
      </button>
    </MolduraOrnamentada>
  )
}
