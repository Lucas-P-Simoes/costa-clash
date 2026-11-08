// Histórias (lore) exibidas no modal ao escolher um adversário. Texto narrativo PROVISÓRIO, aguardando revisão do
// responsável pelo projeto. Personagens são fictícios; as afirmações ambientais devem permanecer defensáveis
// (nada "elimina" um risco por completo).

export const HISTORIAS_OPONENTES: Readonly<Record<string, readonly string[]>> = {
  'guardiao-manguezal': [
    'Entre as raízes do manguezal vive o Guardião do Mangue, tão antigo que a maré já o conhecia pelo nome. Seus pés são raízes e seus cabelos, folhas.',
    'Neste primeiro duelo ele não luta para vencer: ensina. Mostra como baixar uma carta, atacar e defender, e lembra que o manguezal é berçário de peixes, caranguejos e aves e ajuda a segurar o sedimento na beira da água.',
    'Aproveite as lições. Há sinais de que algo escuro começa a se infiltrar entre as raízes...',
  ],
  'mancha-de-oleo': [
    'Um navio perdeu parte da carga e o óleo se espalhou sobre a água, escuro e brilhante. A Mancha de Óleo nasceu ali e avança com a corrente.',
    'Óleo na água forma uma película que pode sujar as penas das aves, prejudicar peixes e se depositar em praias e manguezais, e a limpeza costuma ser lenta e trabalhosa.',
    'Ela se espalha rápido, mas barreiras de contenção e resposta ágil ajudam a limitar o estrago. Mostre que você sabe agir a tempo.',
  ],
  'erosao-costeira': [
    'Onda após onda, a Erosão leva um pouco da praia. Ela não tem pressa: ao longo dos anos, a faixa de areia recua e o chão desaparece sob os pés.',
    'Ondas e correntes naturalmente moldam o litoral, mas a retirada de vegetação e a ocupação desordenada podem acelerar o desgaste.',
    'Seu corpo é feito de barranco e pedra solta. Para detê-la, é preciso entender o que segura a costa no lugar.',
  ],
  ressaca: [
    'Quando o vento muda e o mar cresce, a Ressaca desperta. Seus olhos brilham dentro da onda que se ergue acima do calçadão.',
    'Ressacas são ondas fortes e mar agitado que podem invadir ruas, danificar construções e arrastar areia da praia. Com a elevação do nível do mar, o risco costeiro pode aumentar.',
    'Ela vem com força, mas passa. Prepare-se e resista à investida: quem observa os avisos do tempo sofre menos.',
  ],
  urbanizacao: [
    'Os prédios cresceram rápido demais, um ao lado do outro, e um dia ganharam vida (e óculos escuros). A Urbanização acha que a orla é toda dela.',
    'Cidade na beira do mar traz moradia e trabalho, mas a ocupação sem planejamento pode impermeabilizar o solo, reduzir áreas naturais e aumentar a pressão sobre a costa.',
    'Ela não é vilã por inteiro: precisa de planejamento. Mostre a ela que cidade e costa podem crescer juntas.',
  ],
  porto: [
    'O Capataz do Porto conhece cada guindaste e cada navio que atraca. Para ele, o cais nunca dorme: cargas chegam e partem em qualquer hora.',
    'Portos movimentam a economia e geram empregos, mas exigem gestão cuidadosa de resíduos, de dragagem e do tráfego de navios, para reduzir danos à vida marinha.',
    'Ele não é inimigo do mar, só tem pressa. Mostre que dá para trabalhar no cais cuidando da água.',
  ],
  'poluicao-plastica': [
    'Garrafas, sacolas, redes perdidas e restos de toda sorte se juntaram numa correnteza e formaram uma criatura que ninguém queria criar.',
    'A Poluição Plástica nasceu do descuido de muita gente, um pouco de cada vez. Plástico e outros resíduos podem ferir animais e contaminar a água.',
    'Ela cresce a cada descarte errado. Cada vitória sua mostra que o caminho de volta existe: reduzir, reaproveitar e destinar corretamente o lixo.',
  ],
  'esgoto-clandestino': [
    'Por um cano escondido, longe dos olhos de todos, o Esgoto Clandestino escorre até a praia. Ninguém vê de onde vem, mas todos sentem o cheiro.',
    'Esgoto sem tratamento pode contaminar a água, reduzir o oxigênio disponível para a vida aquática e trazer riscos à saúde de quem entra no mar.',
    'Ele se esconde bem. Saneamento e monitoramento da água ajudam a encontrá-lo e a reduzir o seu alcance.',
  ],
  'pesca-predatoria': [
    'Redes muito fechadas, barcos em excesso e pesca na época da reprodução: a Pesca Predatória leva tudo o que encontra, sem pensar no amanhã.',
    'Pescar mais do que os estoques conseguem repor, ou capturar peixes ainda jovens, pode reduzir as populações e afetar quem depende da pesca para viver.',
    'Ela é gananciosa, mas pode ser contida com regras de tamanho mínimo, períodos de defeso e fiscalização. Mostre que pescar e conservar podem andar juntos.',
  ],
  'especies-invasoras': [
    'Dentro de um navio, na água de lastro, chegou uma criatura que não pertencia a este litoral. Sem predadores por aqui, ela se espalhou depressa.',
    'Espécies de outras regiões podem competir com as nativas por alimento e espaço, e alterar a cadeia alimentar do ambiente que ocupam.',
    'Ela não tem culpa de ter sido trazida, mas o estrago é real. Prevenir a chegada e monitorar novas ocorrências ajuda a limitar o problema.',
  ],
  'mare-vermelha': [
    'Em águas quentes e cheias de nutrientes, algas minúsculas se multiplicaram até tingir o mar de vermelho. Assim despertou a Maré Vermelha.',
    'O crescimento excessivo de certas algas pode liberar toxinas, reduzir o oxigênio e prejudicar peixes e mariscos, além de afetar a saúde de quem os consome.',
    'Ela costuma surgir quando há excesso de nutrientes, como os do esgoto. Reduzir essa carga ajuda a diminuir a chance de novos episódios.',
  ],
  'residuos-quimicos': [
    'Tonéis enferrujados, restos de tinta e produtos que ninguém sabe ao certo o que são: os Resíduos Químicos escorreram até o mar e ficaram.',
    'Substâncias químicas lançadas sem controle podem se acumular na água, nos sedimentos e nos organismos marinhos, passando de um animal a outro pela cadeia alimentar.',
    'Eles são difíceis de enxergar e de remover. Controle de lançamentos e destinação correta são o melhor caminho.',
  ],
  mineracao: [
    'Máquinas pesadas cavam a areia e a rocha sem parar. A Mineração arranca da terra o que lhe interessa e deixa buracos onde havia vegetação.',
    'A extração de areia e minérios na costa pode remover a vegetação, revolver sedimentos e alterar a dinâmica das praias e dos rios.',
    'Ela traz matéria-prima, mas cobra um preço. Licenciamento, fiscalização e recuperação das áreas exploradas reduzem o impacto.',
  ],
  'bitucas-na-areia': [
    'Uma por uma, tão pequenas que ninguém liga: as bitucas se juntaram na areia e deram forma a um adversário que só cresce.',
    'Bitucas de cigarro são um dos resíduos mais comuns nas praias, demoram a se degradar e podem liberar substâncias tóxicas na água e na areia.',
    'Pequenos gestos fazem diferença: descartar no lugar certo evita que cada uma delas vire problema.',
  ],
  'poluicao-farmacos': [
    'Remédios vencidos jogados na pia ou no vaso e resíduos que o corpo não absorve seguem pelo esgoto. A Poluição por Fármacos nasceu desse caminho invisível.',
    'Muitas estações de tratamento não removem totalmente os resíduos de medicamentos, que podem chegar aos rios e ao mar e afetar a vida aquática.',
    'Ela não tem cheiro nem cor. Descartar remédios em pontos de coleta e investir em tratamento melhor ajudam a reduzir o problema.',
  ],
  'guardiao-corrompido': [
    'O Guardião que antes ensinava a proteger o manguezal foi tomado pela poluição. Suas raízes escurecem e as folhas, antes verdes, agora pingam lodo.',
    'Ele conhece cada truque que ensinou a você, e agora os usa contra você. Um manguezal degradado perde parte do que oferecia: abrigo para a fauna e proteção da margem.',
    'Ainda resta algo do antigo protetor lá dentro. Vença-o e lembre que cuidar do manguezal é muito mais fácil do que recuperá-lo.',
  ],
  'ser-humano': [
    'No fim da jornada não há monstro das profundezas, apenas uma pessoa na orla. O Ser Humano pode ser a causa de todos os impactos que você enfrentou, ou a solução para eles.',
    'Lixo, esgoto, óleo, construções e pesca em excesso nascem de escolhas humanas, e também as soluções: consumo consciente, tratamento, fiscalização e planejamento.',
    'Este é o último duelo. Mostre que a costa pode ficar em boas mãos.',
  ],
}

export function historiaDoOponente(id: string): readonly string[] {
  return HISTORIAS_OPONENTES[id] ?? []
}
