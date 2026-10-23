// Adversários do modo "Duelo Livre". Apenas apresentação (seleção de adversário): NÃO há baralho
// nem balanceamento por adversário nesta etapa, o duelo ainda não existe.
// ATENÇÃO: descrições (exceto a de Ressaca, que vem da referência visual) e dificuldades são PROVISÓRIAS
// e aguardam revisão do responsável pelo projeto (ver docs/ESTADO_DO_PROJETO.md).

export type NivelDificuldade = 1 | 2 | 3
export type GrupoOponente = 'ecossistema' | 'fauna' | 'atividade' | 'impacto'

export interface Oponente {
  /** Id estável (também nome base do arquivo de retrato). */
  id: string
  nome: string
  dificuldade: NivelDificuldade
  grupo?: GrupoOponente
  descricao: string
  /** Nome do arquivo em src/assets/oponentes/. */
  retrato: string
  /** Arte grande própria do painel de detalhe (opcional; sem ela usa-se o retrato ampliado). */
  retratoGrande?: string
}

export const ROTULO_DIFICULDADE: Readonly<Record<NivelDificuldade, string>> = { 1: 'Fácil', 2: 'Médio', 3: 'Difícil' }

// Grupos alinhados às cartas afins do catálogo: Urbanização ~ CC-033 Urbanização Planejada (atividade);
// Porto ~ CC-058 Expansão Portuária (impacto). Grupo é só rótulo temático, não define baralho.
export const OPONENTE_PADRAO_ID = 'ressaca'

// Ordem = ordem da grade 4x4 da referência (linha a linha).
export const OPONENTES: readonly Oponente[] = [
  {
    id: 'guardiao-manguezal',
    nome: 'Guardião do Manguezal',
    dificuldade: 1,
    grupo: 'ecossistema',
    descricao: 'Protege áreas de manguezal, ecossistema que abriga diversas espécies e ajuda a reter sedimentos.',
    retrato: 'guardiao-manguezal.png',
  },
  {
    id: 'fiscal-ambiental',
    nome: 'Fiscal Ambiental',
    dificuldade: 1,
    grupo: 'atividade',
    descricao: 'Acompanha atividades no litoral e atua para que as regras de proteção ambiental sejam cumpridas.',
    retrato: 'fiscal-ambiental.png',
  },
  {
    id: 'pescador-tradicional',
    nome: 'Pescador Tradicional',
    dificuldade: 1,
    grupo: 'atividade',
    descricao: 'Conhece as marés e o pescado local. A pesca manejada ajuda a conciliar renda e conservação dos estoques.',
    retrato: 'pescador-tradicional.png',
  },
  {
    id: 'tartaruga-marinha',
    nome: 'Tartaruga Marinha',
    dificuldade: 1,
    grupo: 'fauna',
    descricao: 'Várias espécies de tartarugas marinhas estão ameaçadas e dependem de praias e mares preservados para se alimentar e desovar.',
    retrato: 'tartaruga-marinha.png',
  },
  {
    id: 'poluicao-mar',
    nome: 'Poluição do Mar',
    dificuldade: 2,
    grupo: 'impacto',
    descricao: 'Reúne cartas ligadas ao lixo e a outros poluentes, que podem prejudicar a fauna e a qualidade da água.',
    retrato: 'poluicao-mar.png',
  },
  {
    id: 'erosao-costeira',
    nome: 'Erosão Costeira',
    dificuldade: 2,
    grupo: 'impacto',
    descricao: 'Desgaste da faixa de terra pela ação de ondas e correntes, que pode ser agravado pela ocupação e pela perda de vegetação.',
    retrato: 'erosao-costeira.png',
  },
  {
    id: 'ressaca',
    nome: 'Ressaca',
    dificuldade: 2,
    grupo: 'impacto',
    descricao: 'Domina cartas de impacto costeiro, como ressacas, inundações e aumento do nível do mar.',
    retrato: 'ressaca.png',
    retratoGrande: 'ressaca-grande.png',
  },
  {
    id: 'urbanizacao',
    nome: 'Urbanização',
    dificuldade: 3,
    grupo: 'atividade',
    descricao: 'A ocupação desordenada da orla pode aumentar a impermeabilização do solo e a pressão sobre os ecossistemas costeiros.',
    retrato: 'urbanizacao.png',
  },
  {
    id: 'restinga',
    nome: 'Restinga',
    dificuldade: 1,
    grupo: 'ecossistema',
    descricao: 'Vegetação de dunas e planícies arenosas que ajuda a estabilizar a areia e abriga espécies próprias do litoral.',
    retrato: 'restinga.png',
  },
  {
    id: 'coral',
    nome: 'Coral',
    dificuldade: 2,
    grupo: 'ecossistema',
    descricao: 'Recifes de coral abrigam grande diversidade marinha e são sensíveis ao aquecimento da água e à poluição.',
    retrato: 'coral.png',
  },
  {
    id: 'chuva-intensa',
    nome: 'Chuva Intensa',
    dificuldade: 3,
    grupo: 'impacto',
    descricao: 'Chuvas fortes podem causar enchentes e levar lixo e sedimentos até os rios e o mar.',
    retrato: 'chuva-intensa.png',
  },
  {
    id: 'porto',
    nome: 'Porto',
    dificuldade: 3,
    grupo: 'impacto',
    descricao: 'A atividade portuária movimenta a economia, mas exige gestão cuidadosa de resíduos, dragagem e tráfego de navios.',
    retrato: 'porto.png',
  },
  {
    id: 'comunidade-caicara',
    nome: 'Comunidade Caiçara',
    dificuldade: 1,
    grupo: 'atividade',
    descricao: 'Comunidade tradicional do litoral, cujo modo de vida costuma envolver pesca artesanal e, em muitos casos, agricultura em pequena escala e extrativismo.',
    retrato: 'comunidade-caicara.png',
  },
  {
    id: 'recuperacao-ambiental',
    nome: 'Recuperação Ambiental',
    dificuldade: 2,
    grupo: 'ecossistema',
    descricao: 'Ações de restauro, como o replantio de vegetação nativa, ajudam a recuperar áreas degradadas ao longo do tempo.',
    retrato: 'recuperacao-ambiental.png',
  },
  {
    id: 'planejamento-costeiro',
    nome: 'Planejamento Costeiro',
    dificuldade: 3,
    grupo: 'atividade',
    descricao: 'Planejar o uso da orla com base em dados ajuda a reduzir conflitos e riscos para pessoas e ecossistemas.',
    retrato: 'planejamento-costeiro.png',
  },
  {
    id: 'biodiversidade-costeira',
    nome: 'Biodiversidade Costeira',
    dificuldade: 3,
    grupo: 'fauna',
    descricao: 'A variedade de aves, peixes e plantas do litoral contribui para o funcionamento dos ambientes costeiros.',
    retrato: 'biodiversidade-costeira.png',
  },
]

const URLS = import.meta.glob<string>('../assets/oponentes/*.png', { eager: true, query: '?url', import: 'default' })

/** URL empacotada de um arquivo de src/assets/oponentes/ (undefined se não existir). */
export function urlArquivoOponente(arquivo: string): string | undefined {
  return URLS[`../assets/oponentes/${arquivo}`]
}

export function buscarOponente(id: string): Oponente | undefined {
  return OPONENTES.find((o) => o.id === id)
}
