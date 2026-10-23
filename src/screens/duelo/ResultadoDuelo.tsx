import { useRef } from 'react'
import { useFocoDialogo } from '../../components/duelo/useFocoDialogo'
import { BotaoRetro } from '../../components/ui/BotaoRetro'
import { IconeEspadas, IconeVoltar } from '../../components/ui/Icones'
import type { Resultado } from '../../game'

interface Props {
  resultado: Resultado
  nomeOponente: string
  conceitos: { nome: string; texto: string }[]
  onNovamente: () => void
  onVoltar: () => void
}

function tituloResultado(r: Resultado): string {
  return r.vencedor === 'humano' ? 'Vitória' : r.vencedor === 'oponente' ? 'Derrota' : 'Empate'
}

function motivoResultado(r: Resultado, nomeOponente: string): string {
  const eu = r.vencedor === 'humano'
  switch (r.motivo) {
    case 'lp':
      return eu ? `A vida de ${nomeOponente} chegou a zero.` : 'Sua vida chegou a zero.'
    case 'empate_lp':
      return 'A vida dos dois lados chegou a zero ao mesmo tempo.'
    case 'compra':
      return eu ? `${nomeOponente} ficou sem cartas para repor a mão.` : 'Você ficou sem cartas no baralho para repor a mão.'
    case 'desistencia':
      return eu ? `${nomeOponente} desistiu do duelo.` : 'Você desistiu do duelo.'
    case 'repeticao':
      return 'O duelo se repetiu sem avanço e foi encerrado como empate técnico.'
  }
}

/** Tela de resultado (overlay modal) com motivo, até 3 conceitos educativos e opções de continuar. */
export function ResultadoDuelo({ resultado, nomeOponente, conceitos, onNovamente, onVoltar }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useFocoDialogo(ref)
  const titulo = tituloResultado(resultado)
  return (
    <div className="duelo-overlay">
      <div ref={ref} className={`duelo-dialogo moldura textura-pedra duelo-dialogo--${titulo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}`} role="dialog" aria-modal="true" aria-labelledby="duelo-resultado-titulo">
        <h2 id="duelo-resultado-titulo" className="duelo-dialogo__titulo">
          {titulo}
        </h2>
        <p className="duelo-dialogo__motivo">{motivoResultado(resultado, nomeOponente)}</p>
        {conceitos.length > 0 ? (
          <section aria-labelledby="duelo-conceitos">
            <h3 id="duelo-conceitos" className="duelo-dialogo__sub">
              Para aprender
            </h3>
            <ul className="duelo-dialogo__lista">
              {conceitos.map((c) => (
                <li key={c.nome}>
                  <strong>{c.nome}:</strong> {c.texto}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <p className="duelo-dialogo__breve">Recompensas de cartas: em breve.</p>
        <div className="duelo-dialogo__botoes">
          <button type="button" className="botao botao--primario" data-foco-inicial onClick={onNovamente}>
            <span className="botao__icone">
              <IconeEspadas />
            </span>
            <span>Jogar novamente</span>
          </button>
          <BotaoRetro icone={<IconeVoltar />} onClick={onVoltar}>
            Voltar
          </BotaoRetro>
        </div>
      </div>
    </div>
  )
}
