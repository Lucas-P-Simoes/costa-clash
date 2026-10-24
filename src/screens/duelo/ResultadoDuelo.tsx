import { useRef } from 'react'
import cenaDerrota from '../../assets/duelo/resultado-cena-derrota.jpg'
import cenaVitoria from '../../assets/duelo/resultado-cena-vitoria.jpg'
import { IconeCoracaoVida } from '../../components/duelo/iconesDuelo'
import { useFocoDialogo } from '../../components/duelo/useFocoDialogo'
import { BotaoRetro } from '../../components/ui/BotaoRetro'
import { IconeCartas, IconeEspadas, IconeLivro, IconeVoltar } from '../../components/ui/Icones'
import { MolduraOrnamentada } from '../../components/ui/MolduraOrnamentada'
import type { Resultado } from '../../game'

/** Números públicos do duelo para o resumo (vida final, unidades em campo, rodadas). Nada oculto. */
export interface DadosResultado {
  vidaOponente: number
  vidaVoce: number
  emJogoOponente: number
  emJogoVoce: number
  rodadas: number
}

interface Props {
  resultado: Resultado
  nomeOponente: string
  dados: DadosResultado
  conceitos: { nome: string; texto: string }[]
  onNovamente: () => void
  onVoltar: () => void
}

type Tipo = 'vitoria' | 'derrota' | 'empate'

function tipoResultado(r: Resultado): Tipo {
  return r.vencedor === 'humano' ? 'vitoria' : r.vencedor === 'oponente' ? 'derrota' : 'empate'
}

const TITULO: Record<Tipo, string> = { vitoria: 'Vitória', derrota: 'Derrota', empate: 'Empate' }
const FRASE: Record<Tipo, string> = {
  vitoria: 'O litoral está mais protegido',
  derrota: 'O litoral ainda precisa de você',
  empate: 'Ninguém levou a melhor desta vez',
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

/**
 * Tela de resultado (diálogo modal) no estilo de Tela-derrota/Tela-recompensa: título em placa de pedra, motivo,
 * conceitos aprendidos, resumo do duelo e as ações JOGAR NOVAMENTE / VOLTAR. Recompensas continuam "em breve".
 */
export function ResultadoDuelo({ resultado, nomeOponente, dados, conceitos, onNovamente, onVoltar }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useFocoDialogo(ref)
  const tipo = tipoResultado(resultado)
  const titulo = TITULO[tipo]
  const tom = tipo === 'vitoria' ? 'ouro' : tipo === 'derrota' ? 'vermelho' : 'ciano'
  return (
    <div className="duelo-overlay duelo-overlay--resultado">
      <div ref={ref} className={`duelo-resultado duelo-dialogo--${tipo}`} role="dialog" aria-modal="true" aria-labelledby="duelo-resultado-titulo">
        <div className="duelo-resultado__cena" aria-hidden="true">
          <img className="duelo-resultado__cena-img" src={tipo === 'vitoria' ? cenaVitoria : cenaDerrota} alt="" />
        </div>
        <MolduraOrnamentada tom={tom} className="duelo-resultado__placa" classeMiolo="duelo-resultado__placa-miolo">
          <h2 id="duelo-resultado-titulo" className="duelo-dialogo__titulo">
            {titulo}
          </h2>
          <p className="duelo-resultado__frase">{FRASE[tipo]}</p>
        </MolduraOrnamentada>

        <div className="duelo-resultado__corpo">
          <MolduraOrnamentada tom="azul" className="duelo-resultado__texto" classeMiolo="duelo-resultado__texto-miolo">
            <p className="duelo-dialogo__motivo">{motivoResultado(resultado, nomeOponente)}</p>
            {conceitos.length > 0 ? (
              <section aria-labelledby="duelo-conceitos">
                <h3 id="duelo-conceitos" className="duelo-dialogo__sub">
                  <IconeLivro className="duelo-dialogo__sub-icone" />
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
          </MolduraOrnamentada>

          <MolduraOrnamentada as="section" tom="ciano" className="duelo-resultado__resumo" classeMiolo="duelo-resultado__resumo-miolo" aria-label="Resumo do duelo">
            <h3 className="duelo-resultado__resumo-titulo">Resumo do duelo</h3>
            <div className="duelo-resultado__cabeca" aria-hidden="true">
              <span>{nomeOponente}</span>
              <span className="duelo-resultado__vs">vs</span>
              <span>Você</span>
            </div>
            <dl className="duelo-resultado__linhas">
              <div className="duelo-resultado__linha">
                <dt>
                  <IconeCoracaoVida className="duelo-resultado__icone" cor="#ff5a4a" />
                  Vida final
                </dt>
                <dd aria-label={`Vida final do oponente: ${dados.vidaOponente}`} className="duelo-resultado__v-op">
                  {dados.vidaOponente}
                </dd>
                <dd aria-label={`Sua vida final: ${dados.vidaVoce}`} className="duelo-resultado__v-eu">
                  {dados.vidaVoce}
                </dd>
              </div>
              <div className="duelo-resultado__linha">
                <dt>
                  <IconeCartas className="duelo-resultado__icone" />
                  Unidades em campo
                </dt>
                <dd aria-label={`Unidades do oponente em campo: ${dados.emJogoOponente}`}>{dados.emJogoOponente}</dd>
                <dd aria-label={`Suas unidades em campo: ${dados.emJogoVoce}`}>{dados.emJogoVoce}</dd>
              </div>
              <div className="duelo-resultado__linha">
                <dt>Rodadas</dt>
                <dd className="duelo-resultado__ambos" aria-label={`Rodadas jogadas: ${dados.rodadas}`}>
                  {dados.rodadas}
                </dd>
              </div>
            </dl>
            <p className="duelo-dialogo__breve">Recompensas de cartas: em breve.</p>
          </MolduraOrnamentada>
        </div>

        <div className="duelo-dialogo__botoes">
          <button type="button" className="botao botao--primario duelo-resultado__novamente" data-foco-inicial onClick={onNovamente}>
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
