import { useState } from 'react'
import { CartaView } from '../../components/duelo/CartaView'
import { SeloCarta } from '../../components/duelo/SeloCarta'
import { descricaoCarta } from '../../components/duelo/textoCarta'
import { arteDaCarta, ROTULO_ESTADO_ARTE } from '../../arte/arteDisponivel'
import type { ArteDaCarta } from '../../arte/arteDisponivel'
import { CATEGORIAS, ORDEM_CATEGORIAS, classificarCarta } from '../../arte/categorias'
import { CRITERIOS_GERAIS, PILOTO } from '../../arte/piloto'
import { PALETAS, montarPrompt } from '../../arte/prompts'
import { SUJEITOS } from '../../arte/sujeitos'
import { CATALOGO } from '../../data/catalogo'
import '../duelo/duelo.css'
import './avaliacaoArte.css'

type EstadoCopia = 'ok' | 'erro' | null

async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    return false
  }
}

function SeloEstado({ arte }: { arte: ArteDaCarta | null }) {
  if (!arte) return <p className="avarte__selo avarte__selo--pendente">PENDENTE — sem arte gerada</p>
  if (arte.estado === 'provisoria') return <p className="avarte__selo avarte__selo--provisoria">PROVISÓRIA — recorte da referência, baixa resolução</p>
  return <p className="avarte__selo avarte__selo--ok">{ROTULO_ESTADO_ARTE[arte.estado]}</p>
}

function ItemPiloto({ id, categoria, criterios, arteDe }: { id: string; categoria: string; criterios: readonly string[]; arteDe: (id: string) => ArteDaCarta | null }) {
  const carta = CATALOGO.find((c) => c.id === id)!
  const arte = arteDe(id)
  const prompt = montarPrompt(carta, 'pt')
  const [copia, setCopia] = useState<EstadoCopia>(null)
  const paleta = PALETAS[SUJEITOS[id].paleta]
  return (
    <article className="avarte__item" aria-labelledby={`avarte-${id}`}>
      <h2 id={`avarte-${id}`}>
        {id} — {carta.nome}
      </h2>
      <div className="avarte__carta">
        <CartaView carta={carta} tamanho="mao" rotulo={descricaoCarta(carta)} arte={arte} />
      </div>
      <SeloEstado arte={arte} />
      <p className="avarte__meta">
        Categoria: {categoria}. Paleta: {paleta.rotulo}. Moldura: {CATEGORIAS[classificarCarta(carta).categoria].rotulo}.
      </p>
      {arte?.estado === 'provisoria' ? (
        <p className="avarte__aviso">Provisória de baixa resolução, só para o dono avaliar o estilo. Será substituída por arte final em 768x1024.</p>
      ) : null}
      <h3>Prompt da versão final (768x1024)</h3>
      <textarea className="avarte__prompt" readOnly value={prompt} rows={9} aria-label={`Prompt da carta ${carta.nome}`} />
      <button type="button" className="avarte__copiar" onClick={async () => setCopia((await copiarTexto(prompt)) ? 'ok' : 'erro')}>
        Copiar prompt
      </button>
      <span role="status" className="avarte__status">
        {copia === 'ok' ? 'Prompt copiado.' : copia === 'erro' ? 'Não foi possível copiar; selecione o texto acima.' : ''}
      </span>
      <h3>Critérios de aprovação</h3>
      <ul>
        {criterios.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </article>
  )
}

/** Página de desenvolvimento (?arte=1): avaliação do estilo das ilustrações, com as 5 cartas piloto. Não faz parte do jogo. */
export function PaginaAvaliacaoArte({ arteDe = arteDaCarta }: { arteDe?: (id: string) => ArteDaCarta | null }) {
  return (
    <main className="avarte">
      <h1>Avaliação do estilo das ilustrações (desenvolvimento)</h1>
      <p className="avarte__aviso" role="note">
        Nenhuma ilustração final foi gerada. As cartas com arte abaixo usam recortes PROVISÓRIOS da referência de estilo do dono (Estilos-de-cartas.webp), em baixa
        resolução e fora de 3:4, só para avaliar estilo e moldura. As demais 95 cartas continuam com a arte SVG de fallback.
      </p>
      <section aria-labelledby="avarte-legenda">
        <h2 id="avarte-legenda">Molduras e selos por categoria</h2>
        <ul className="avarte__legenda">
          {ORDEM_CATEGORIAS.map((id) => (
            <li key={id} style={{ borderColor: CATEGORIAS[id].borda }}>
              <span className="avarte__selo-demo" style={{ ['--c-borda' as string]: CATEGORIAS[id].borda }}>
                <SeloCarta selo={CATEGORIAS[id].selo} />
              </span>
              <span>
                <strong>{CATEGORIAS[id].rotulo}</strong>
                <br />
                <small>{CATEGORIAS[id].temas}</small>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <div className="avarte__grade">
        {PILOTO.map((p) => (
          <ItemPiloto key={p.id} id={p.id} categoria={p.categoria} criterios={p.criterios} arteDe={arteDe} />
        ))}
      </div>
      <section aria-labelledby="avarte-geral">
        <h2 id="avarte-geral">Critérios gerais</h2>
        <ul>
          {CRITERIOS_GERAIS.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>
    </main>
  )
}
