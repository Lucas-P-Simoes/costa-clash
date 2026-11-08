// Adversários do modo "Duelo Livre". Cada id também aponta para um baralho provisório em
// `baralhosOponentes.ts`.
// ATENÇÃO: descrições (exceto a de Ressaca, que vem da referência visual) e dificuldades são PROVISÓRIAS
// e aguardam revisão do responsável pelo projeto (ver docs/ESTADO_DO_PROJETO.md).
// Lista e ordem definidas pelo dono em 08/11/2026 (17 oponentes de impacto). Os 12 chefes destacados pelo
// responsável receberam retratos próprios em pixel art; os demais preservam seus assets anteriores.

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

// Grupos alinhados às cartas afins do catálogo: Urbanização ~ CC-133 Urbanização Planejada (atividade);
// Porto ~ CC-158 Expansão Portuária (impacto). Grupo é só rótulo temático, não define baralho.
export const OPONENTE_PADRAO_ID = 'ressaca'

// Ordem = ordem visual da grade (linha a linha). O atalho inativo BARALHO não faz parte destes dados.
export const OPONENTES: readonly Oponente[] = [
  {
    id: 'guardiao-manguezal',
    nome: 'Guardião do Mangue',
    dificuldade: 1,
    grupo: 'ecossistema',
    descricao: 'Protege o manguezal, que abriga diversas espécies e ajuda a reter sedimentos. Ensina os primeiros passos do duelo.',
    retrato: 'guardiao-manguezal.png',
    retratoGrande: 'guardiao-manguezal-grande.png',
  },
  {
    id: 'mancha-de-oleo',
    nome: 'Mancha de Óleo',
    dificuldade: 1,
    grupo: 'impacto',
    descricao: 'Óleo derramado forma uma película na água que pode prejudicar aves, peixes e a vida nas praias e manguezais.',
    retrato: 'mancha-de-oleo.png',
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
    id: 'porto',
    nome: 'Porto',
    dificuldade: 3,
    grupo: 'impacto',
    descricao: 'A atividade portuária movimenta a economia, mas exige gestão cuidadosa de resíduos, dragagem e tráfego de navios.',
    retrato: 'porto.png',
  },
  {
    id: 'poluicao-plastica',
    nome: 'Poluição Plástica',
    dificuldade: 2,
    grupo: 'impacto',
    descricao: 'Sacolas, garrafas e fragmentos de plástico chegam ao mar e podem ferir animais e contaminar a cadeia alimentar.',
    retrato: 'poluicao-plastica.png',
  },
  {
    id: 'esgoto-clandestino',
    nome: 'Esgoto Clandestino',
    dificuldade: 2,
    grupo: 'impacto',
    descricao: 'Esgoto lançado sem tratamento pode contaminar a água, reduzir o oxigênio e trazer riscos à saúde de banhistas.',
    retrato: 'esgoto-clandestino.png',
  },
  {
    id: 'pesca-predatoria',
    nome: 'Pesca Predatória',
    dificuldade: 2,
    grupo: 'impacto',
    descricao: 'Pescar em excesso ou em época de reprodução pode reduzir os estoques de peixe e afetar quem vive da pesca.',
    retrato: 'pesca-predatoria.png',
  },
  {
    id: 'especies-invasoras',
    nome: 'Espécies Invasoras',
    dificuldade: 3,
    grupo: 'impacto',
    descricao: 'Espécies trazidas de outras regiões podem competir com as nativas por alimento e espaço e alterar o ambiente.',
    retrato: 'especies-invasoras.png',
  },
  {
    id: 'mare-vermelha',
    nome: 'Maré Vermelha',
    dificuldade: 3,
    grupo: 'impacto',
    descricao: 'Proliferação de algas microscópicas que pode liberar toxinas e prejudicar peixes, mariscos e a saúde de quem os consome.',
    retrato: 'mare-vermelha.png',
  },
  {
    id: 'residuos-quimicos',
    nome: 'Resíduos Químicos',
    dificuldade: 3,
    grupo: 'impacto',
    descricao: 'Substâncias químicas lançadas por indústrias e outras fontes podem se acumular na água e nos organismos marinhos.',
    retrato: 'residuos-quimicos.png',
  },
  {
    id: 'mineracao',
    nome: 'Mineração',
    dificuldade: 3,
    grupo: 'impacto',
    descricao: 'A extração de areia e minérios pode remover vegetação, mexer nos sedimentos e alterar a dinâmica da costa.',
    retrato: 'mineracao.png',
  },
  {
    id: 'bitucas-na-areia',
    nome: 'Bitucas na Areia',
    dificuldade: 3,
    grupo: 'impacto',
    descricao: 'Bitucas de cigarro são muito comuns nas praias, demoram a se degradar e podem liberar substâncias tóxicas.',
    retrato: 'bitucas-na-areia.png',
  },
  {
    id: 'poluicao-farmacos',
    nome: 'Poluição por Fármacos',
    dificuldade: 3,
    grupo: 'impacto',
    descricao: 'Resíduos de medicamentos que passam pelo esgoto e não são removidos podem chegar à água e afetar organismos aquáticos.',
    retrato: 'poluicao-farmacos.png',
  },
  {
    id: 'guardiao-corrompido',
    nome: 'Guardião do Mangue Corrompido',
    dificuldade: 3,
    grupo: 'impacto',
    descricao: 'O Guardião tomado pela poluição: o mesmo protetor do manguezal, agora a serviço dos impactos que antes combatia.',
    retrato: 'guardiao-corrompido.png',
    retratoGrande: 'guardiao-corrompido.png',
  },
  {
    id: 'ser-humano',
    nome: 'Ser Humano',
    dificuldade: 3,
    grupo: 'impacto',
    descricao: 'As atividades humanas podem causar ou evitar os impactos na costa. O último duelo põe suas escolhas à prova.',
    retrato: 'ser-humano.png',
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
