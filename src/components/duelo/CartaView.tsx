import { useState } from 'react'
import type { Carta } from '../../game/tipos'
import { arteDaCarta } from '../../arte/arteDisponivel'
import type { ArteDaCarta } from '../../arte/arteDisponivel'
import { classificarCarta } from '../../arte/categorias'
import { IconeEspadas } from '../ui/Icones'
import { ArteCarta } from './ArteCarta'
import { IconeEscudo } from './iconesDuelo'
import { SeloCarta } from './SeloCarta'
import { efeitoCurto, nomeCurto, rotuloTipo, tipoArte } from './textoCarta'

export interface CartaViewProps {
  carta: Carta
  /** ATK/DEF a mostrar (efetivos em campo). Padrão: valores do catálogo. */
  atk?: number
  def?: number
  /** Só em campo. */
  posicao?: 'ATAQUE' | 'DEFESA'
  tamanho?: 'mao' | 'campo' | 'mini'
  selecionada?: boolean
  /** 'alvo' = alvo válido; 'valida' = zona/atacante possível. */
  destaque?: 'alvo' | 'valida' | null
  /** Texto acessível completo (obrigatório: inclui zona, atributos e posição). */
  rotulo: string
  onClick?: () => void
  /** Marca para o foco guiado (primeiro alvo/atacante válido). */
  focoAlvo?: boolean
  /** Se true, o botão continua focável (aria-disabled), mas o clique é ignorado. */
  inativa?: boolean
  /** Ilustração real. Omitido: resolve pelo manifesto (índice do build). null: força o fallback SVG. */
  arte?: ArteDaCarta | null
  /** Efeito visual temporário (classe `carta--fx-*`, só apresentação): entrada da mão ao campo, ataque, impacto, destruição. */
  efeito?: 'entrando' | 'atacando' | 'impacto' | 'destruida' | null
  /** Lado do tabuleiro (a direção das animações de entrada/ataque inverte para o oponente). */
  lado?: 'humano' | 'oponente'
  /** Pointer Events (arrastar da mão ao campo). */
  onPointerDown?: (e: React.PointerEvent<HTMLButtonElement>) => void
  /** Carta da mão em arrasto: esmaecida (volta ao normal se cancelar). */
  arrastando?: boolean
}

/** Ilustração da carta: imagem 3:4 recortada (cover) se houver arte no manifesto; senão (ou em erro de carregamento) a arte SVG por tipo. */
function ArteIlustrada({ carta, arte }: { carta: Carta; arte: ArteDaCarta | null }) {
  const [falhou, setFalhou] = useState<string | null>(null)
  if (!arte || falhou === arte.url) return <ArteCarta tipo={tipoArte(carta)} />
  return (
    <img
      className="carta__imagem"
      src={arte.url}
      alt={`Ilustração da carta ${carta.nome}`}
      loading="lazy"
      decoding="async"
      draggable={false}
      data-arte={arte.estado}
      onError={() => setFalhou(arte.url)}
    />
  )
}

/** Carta do catálogo: moldura por categoria, selo, ilustração (ou arte SVG), placa de nome, ATK (vermelho) / DEF (azul) ou tipo + efeito curto. */
export function CartaView({ carta, atk, def, posicao, tamanho = 'mao', selecionada, destaque, rotulo, onClick, focoAlvo, inativa, arte, efeito, lado, onPointerDown, arrastando }: CartaViewProps) {
  const unidade = carta.tipo === 'unidade'
  const curto = tamanho === 'campo' ? nomeCurto(carta.nome) : carta.nome
  const visual = classificarCarta(carta)
  const ilustracao = arte === undefined ? arteDaCarta(carta.id) : arte
  const classe = [
    'carta',
    `carta--${tamanho}`,
    `carta--${tipoArte(carta)}`,
    `carta--cat-${visual.categoria}`,
    posicao === 'DEFESA' ? 'carta--defesa' : posicao === 'ATAQUE' ? 'carta--ataque' : '',
    efeito ? `carta--fx-${efeito}` : '',
    arrastando ? 'carta--arrastando' : '',
    onPointerDown ? 'carta--arrastavel' : '',
    lado === 'oponente' ? 'carta--lado-op' : '',
    selecionada ? 'carta--selecionada' : '',
    destaque ? `carta--${destaque}` : '',
  ]
    .filter(Boolean)
    .join(' ')
  const conteudo = (
    <>
      <span className="carta__nome">
        {curto !== carta.nome ? (
          <>
            <span className="nome-completo">{carta.nome}</span>
            <span className="nome-curto" aria-hidden="true">
              {curto}
            </span>
          </>
        ) : (
          carta.nome
        )}
      </span>
      <span className="carta__arte" aria-hidden="true">
        <ArteIlustrada key={ilustracao?.url ?? 'svg'} carta={carta} arte={ilustracao} />
        <SeloCarta selo={visual.selo} />
      </span>
      {unidade ? (
        <span className="carta__atributos" aria-hidden="true">
          <span className="carta__atk">
            <small>ATK</small>
            {atk ?? carta.atk}
          </span>
          <span className="carta__def">
            <small>DEF</small>
            {def ?? carta.defesa}
          </span>
        </span>
      ) : (
        <span className="carta__efeito" aria-hidden="true">
          <strong>{rotuloTipo(carta)}</strong>
          {tamanho === 'mao' ? <span>{efeitoCurto(carta)}</span> : null}
        </span>
      )}
      {posicao ? (
        <span className="carta__posicao" aria-hidden="true">
          {posicao === 'ATAQUE' ? <IconeEspadas className="carta__posicao-icone" /> : <IconeEscudo className="carta__posicao-icone" />}
          {posicao === 'ATAQUE' ? 'ATQ' : 'DEF'}
        </span>
      ) : null}
    </>
  )
  if (!onClick) {
    return (
      <div className={classe} role="img" aria-label={rotulo} data-posicao={posicao}>
        {conteudo}
      </div>
    )
  }
  return (
    <button
      type="button"
      className={classe}
      aria-label={rotulo}
      data-posicao={posicao}
      onPointerDown={onPointerDown}
      title={carta.nome}
      data-foco={focoAlvo ? 'alvo' : undefined}
      aria-pressed={selecionada === undefined ? undefined : selecionada}
      aria-disabled={inativa || undefined}
      onClick={() => {
        if (!inativa) onClick()
      }}
    >
      {conteudo}
    </button>
  )
}

/** Verso de carta (mão ou armadilha virada do adversário): não revela nada. */
export function CartaVerso({ rotulo, tamanho = 'mini' }: { rotulo: string; tamanho?: 'mao' | 'campo' | 'mini' }) {
  return (
    <div className={`carta carta--verso carta--${tamanho}`} role="img" aria-label={rotulo}>
      <span className="carta__verso-marca" aria-hidden="true" />
    </div>
  )
}
