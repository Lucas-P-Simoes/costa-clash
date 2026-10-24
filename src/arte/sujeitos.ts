// Sujeitos visuais das 100 cartas, escritos à mão (um por ID), em português e inglês.
// Regras: o sujeito descreve o que aparece NA IMAGEM; nunca contém o nome da carta como letreiro,
// ATK/DEF ou texto a ser desenhado. Impactos são criaturas sombrias que representam o fenômeno
// (sem apologia e sem demonizar pessoas); soluções nunca "eliminam" um risco, apenas o reduzem.
// Este arquivo é só texto: nenhuma ilustração foi gerada a partir dele (ver docs/ARTE_DAS_CARTAS.md).

export type PaletaId = 'ecossistema' | 'vidaMarinha' | 'impacto' | 'fenomeno' | 'solucao' | 'comunidade' | 'urbano' | 'equipamento' | 'armadilha'

/** Forma de composição do assunto principal (define o texto de enquadramento). */
export type Forma = 'criatura' | 'cena' | 'objeto' | 'paisagem' | 'personagem' | 'simbolo'

export interface Sujeito {
  forma: Forma
  paleta: PaletaId
  /** Assunto em português (idioma canônico dos prompts). */
  pt: string
  /** Mesmo assunto em inglês (para geradores que respondem melhor a inglês). */
  en: string
}

function s(forma: Forma, paleta: PaletaId, pt: string, en: string): Sujeito {
  return { forma, paleta, pt, en }
}

export const SUJEITOS: Readonly<Record<string, Sujeito>> = {
  // ---------- Ecossistemas (CC-001 a CC-016) ----------
  'CC-001': s(
    'cena',
    'ecossistema',
    'cena de manguezal em plano amplo, uma grande árvore de mangue ao centro com copa densa verde-amarelada e raízes escora aéreas imponentes em arco descendo até a água rasa azul-turquesa, outras árvores de mangue ao fundo, luz dourada filtrada e reflexos na água',
    'a wide mangrove scene, one large mangrove tree at the center with a dense yellow-green canopy and towering aerial stilt roots arching down into shallow turquoise water, more mangrove trees behind, filtered golden light and reflections on the water',
  ),
  'CC-002': s(
    'cena',
    'ecossistema',
    'restinga preservada em dia ensolarado, duna de areia clara com vegetação rasteira verde, arbustos e grandes flores brancas de miolo alaranjado em primeiro plano, céu azul com nuvens brancas em pixels, mata baixa ao fundo',
    'a preserved restinga on a sunny day, a pale sand dune with low green vegetation, shrubs and large white flowers with orange centers in the foreground, blue sky with white pixel clouds, low scrub forest behind',
  ),
  'CC-003': s(
    'cena',
    'vidaMarinha',
    'recife de coral vibrante com corais ramificados grandes em laranja, vermelho e amarelo ocupando o primeiro plano, peixes tropicais coloridos nadando entre eles, água azul profunda com raios de luz vindos da superfície',
    'a vibrant coral reef with large branching corals in orange, red and yellow filling the foreground, colorful tropical fish swimming among them, deep blue water with light rays from the surface',
  ),
  'CC-004': s(
    'paisagem',
    'ecossistema',
    'grandes dunas de areia dourada com cristas moldadas pelo vento, capim-de-duna e vegetação rasteira, marcas de ondulação na areia, céu azul com nuvens e o mar ao fundo',
    'large golden sand dunes with wind-shaped crests, dune grass and creeping vegetation, ripple marks in the sand, blue sky with clouds and the sea behind',
  ),
  'CC-005': s(
    'paisagem',
    'ecossistema',
    'estuário onde um rio de água esverdeada encontra o mar azul-turquesa, manguezais nas margens, garças e peixes, linha de encontro das águas bem visível, luz dourada de fim de tarde',
    'an estuary where a greenish river meets the turquoise sea, mangroves on the banks, egrets and fish, a clearly visible line where the waters meet, golden late-afternoon light',
  ),
  'CC-006': s(
    'paisagem',
    'ecossistema',
    'praia natural selvagem, areia clara com ondulações, ondas suaves espumando, coqueiros e vegetação nativa nas bordas, pegadas de aves na areia, sem construções',
    'a wild natural beach, pale rippled sand, gentle foaming waves, coconut palms and native vegetation at the edges, bird tracks in the sand, no buildings',
  ),
  'CC-007': s(
    'paisagem',
    'ecossistema',
    'costão rochoso de pedra escura coberto de cracas, mexilhões e algas, poças de maré com estrelas-do-mar e anêmonas, ondas quebrando em espuma, céu de pôr do sol laranja e azul',
    'a dark rocky shore covered in barnacles, mussels and seaweed, tide pools with starfish and anemones, waves breaking into foam, orange and blue sunset sky',
  ),
  'CC-008': s(
    'cena',
    'vidaMarinha',
    'campo submerso de capim-marinho verde ondulando na correnteza, um cavalo-marinho e peixes pequenos entre as folhas, feixes de luz vindos da superfície, areia clara no fundo',
    'a submerged meadow of green seagrass swaying in the current, a seahorse and small fish among the blades, shafts of light from the surface, pale sand below',
  ),
  'CC-009': s(
    'paisagem',
    'ecossistema',
    'lagoa costeira de águas calmas espelhando o céu azul, entre dunas e vegetação de restinga, garças em águas rasas, faixa de areia separando a lagoa do mar ao fundo',
    'a calm coastal lagoon mirroring the blue sky, between dunes and restinga vegetation, egrets in shallow water, a sand bar separating the lagoon from the sea in the background',
  ),
  'CC-010': s(
    'paisagem',
    'ecossistema',
    'encosta de mata atlântica descendo até o mar, árvores cobertas de bromélias, orquídeas e samambaias, um tucano em um galho em primeiro plano, praia pequena e céu azul ao fundo',
    'an Atlantic Forest slope descending to the sea, trees covered in bromeliads, orchids and ferns, a toucan on a branch in the foreground, a small beach and blue sky behind',
  ),
  'CC-011': s(
    'cena',
    'ecossistema',
    'faixa de manguezal na beira do mar, raízes escora formando uma franja densa que dissipa a energia das ondas, espuma se desfazendo entre as raízes, mudas jovens e caranguejos no lodo',
    'a fringe of mangrove at the water edge, stilt roots forming a dense fringe that dissipates wave energy, foam breaking up among the roots, young seedlings and crabs in the mud',
  ),
  'CC-012': s(
    'paisagem',
    'ecossistema',
    'planície de marisma com capim dourado e verde, canais de maré sinuosos refletindo o céu, aves pernaltas caminhando, sedimento escuro e úmido em primeiro plano',
    'a salt marsh plain with golden and green grasses, winding tidal channels reflecting the sky, wading birds walking, dark moist sediment in the foreground',
  ),
  'CC-013': s(
    'paisagem',
    'ecossistema',
    'banco de areia emergindo na maré baixa, linhas de ondulação desenhadas na areia, ondas chegando dos dois lados, aves marinhas descansando, céu azul com nuvens',
    'a sandbank emerging at low tide, ripple lines drawn in the sand, waves arriving from both sides, seabirds resting, blue sky with clouds',
  ),
  'CC-014': s(
    'paisagem',
    'ecossistema',
    'ilha rochosa coberta de vegetação verde com paredões de pedra, ondas quebrando em espuma nas rochas escuras ao redor, céu azul com nuvens e gaivotas',
    'a rocky island covered in green vegetation with stone cliffs, waves breaking into foam on the dark rocks around, blue sky with clouds and gulls',
  ),
  'CC-015': s(
    'paisagem',
    'ecossistema',
    'rio sinuoso em maré cheia entre manguezais, água prateada, marcas de maré nas raízes, uma garça no barranco, margens com vegetação densa',
    'a winding river at high tide between mangroves, silvery water, tide marks on the roots, an egret on the bank, densely vegetated banks',
  ),
  'CC-016': s(
    'paisagem',
    'ecossistema',
    'falésia colorida em camadas de areia ocre e avermelhada, topo coberto de vegetação, raízes finas segurando a encosta, praia estreita embaixo com ondas suaves, céu de fim de tarde',
    'a colorful cliff in layers of ochre and reddish sand, top covered in vegetation, fine roots holding the slope, a narrow beach below with gentle waves, late-afternoon sky',
  ),

  // ---------- Fauna (CC-017 a CC-030) ----------
  'CC-017': s(
    'cena',
    'vidaMarinha',
    'cardume de peixes juvenis minúsculos brilhando entre raízes submersas de mangue e algas, um peixe adulto vigiando ao fundo, luz turquesa filtrada, águas rasas e protegidas',
    'a school of tiny juvenile fish glowing among submerged mangrove roots and algae, an adult fish watching in the background, filtered turquoise light, shallow sheltered water',
  ),
  'CC-018': s(
    'criatura',
    'vidaMarinha',
    'tartaruga marinha majestosa em primeiro plano nadando para a direita sobre um recife de coral colorido em laranja, rosa e roxo, casco verde-azulado com bordas douradas, raios de luz solar atravessando a água azul-turquesa a partir da superfície, peixes pequenos e bolhas ao redor',
    'a majestic sea turtle in the foreground swimming to the right over a colorful coral reef in orange, pink and purple, blue-green shell with golden edges, sunbeams piercing the turquoise water from the surface, small fish and bubbles around',
  ),
  'CC-019': s(
    'criatura',
    'vidaMarinha',
    'boto-cinza emergindo da água, pele cinza-azulada, gotas d\'água em pixels brilhantes, mar escuro e ondas ao redor, expressão curiosa',
    'a Guiana dolphin surfacing, grey-blue skin, glittering pixel water droplets, dark sea and waves around, curious expression',
  ),
  'CC-020': s(
    'criatura',
    'ecossistema',
    'caranguejo-uçá grande de carapaça azulada e pinças vermelhas sobre o lodo do manguezal, olhos pedunculados atentos, raízes de mangue e buracos na lama ao redor',
    'a large uçá mangrove crab with a bluish carapace and red claws on mangrove mud, alert stalked eyes, mangrove roots and burrows in the mud around it',
  ),
  'CC-021': s(
    'criatura',
    'ecossistema',
    'garça-branca grande de corpo inteiro em pé na água rasa em meio a um manguezal, pescoço em S, bico dourado, raízes aéreas e folhagem verde-profunda ao redor, reflexos na água',
    'a large great egret standing full-body in shallow water within a mangrove, S-curved neck, golden beak, aerial roots and deep green foliage around, reflections in the water',
  ),
  'CC-022': s(
    'criatura',
    'vidaMarinha',
    'cavalo-marinho laranja-dourado com a cauda enrolada em um fio de capim-marinho, pequenos pontos de luz flutuando, fundo azul profundo com algas',
    'a golden-orange seahorse with its tail curled around a seagrass blade, tiny floating points of light, deep blue background with algae',
  ),
  'CC-023': s(
    'criatura',
    'vidaMarinha',
    'robalo prateado forte nadando num estuário, escamas com brilho metálico, linha lateral escura, raízes de mangue e água esverdeada ao redor',
    'a strong silvery snook swimming in an estuary, scales with a metallic sheen, dark lateral line, mangrove roots and greenish water around',
  ),
  'CC-024': s(
    'criatura',
    'vidaMarinha',
    'raia costeira deslizando sobre fundo arenoso, asas ondulantes, sombra projetada na areia, feixes de luz turquesa vindos da superfície',
    'a coastal stingray gliding over a sandy bottom, undulating wings, shadow cast on the sand, turquoise light shafts from the surface',
  ),
  'CC-025': s(
    'cena',
    'ecossistema',
    'ostras agarradas a raízes de mangue, uma delas entreaberta com brilho de pérola, água clara passando entre as raízes, lodo escuro e folhas verdes',
    'oysters clinging to mangrove roots, one half-open with a pearly glow, clear water flowing between the roots, dark mud and green leaves',
  ),
  'CC-026': s(
    'criatura',
    'vidaMarinha',
    'coral-cérebro grande com sulcos em labirinto, verde e dourado, pequenos peixes-donzela azuis ao redor, luz de superfície em feixes',
    'a large brain coral with labyrinth grooves, green and gold, small blue damselfish around it, shafts of surface light',
  ),
  'CC-027': s(
    'criatura',
    'vidaMarinha',
    'três golfinhos nadando em diagonal logo abaixo da superfície, água azul clara com raios de luz, um cardume pequeno de peixes dourados e recife ao fundo',
    'three dolphins swimming diagonally just below the surface, clear blue water with light rays, a small school of golden fish and reef in the background',
  ),
  'CC-028': s(
    'criatura',
    'vidaMarinha',
    'bando de aves migratórias pousando numa praia ao pôr do sol, uma ave em destaque com asas abertas ao centro, céu laranja e azul, mar calmo',
    'a flock of migratory shorebirds landing on a beach at sunset, one bird with wings spread at the center, orange and blue sky, calm sea',
  ),
  'CC-029': s(
    'cena',
    'vidaMarinha',
    'cardume de sardinhas prateadas girando em espiral brilhante, luz turquesa e dourada cortando a água, silhuetas de predadores apenas sugeridas ao fundo',
    'a school of silvery sardines spiraling brilliantly, turquoise and golden light cutting through the water, predator silhouettes only hinted at in the background',
  ),
  'CC-030': s(
    'criatura',
    'vidaMarinha',
    'estrela-do-mar laranja grande sobre rocha submersa, poça de maré com ouriços e algas, luz turquesa vinda de cima, texturas de pontos nos braços',
    'a large orange starfish on a submerged rock, tide pool with sea urchins and algae, turquoise light from above, dotted texture on its arms',
  ),

  // ---------- Atividades e soluções (CC-031 a CC-046) ----------
  'CC-031': s(
    'personagem',
    'comunidade',
    'barco de pesca artesanal de madeira com casco vermelho e azul e cabine amarela, pescador na cabine, rede de pesca colorida lançada ao mar, céu de pôr do sol laranja e roxo com gaivotas, ondas ao redor, retrato digno e respeitoso, sem caricatura',
    'a wooden artisanal fishing boat with a red and blue hull and yellow cabin, a fisher in the cabin, a colorful fishing net cast into the sea, orange and purple sunset sky with gulls, waves around, a dignified and respectful portrayal, no caricature',
  ),
  'CC-032': s(
    'cena',
    'solucao',
    'passarela de madeira curva e elevada atravessando vegetação costeira e coqueiros até uma praia de areia clara e mar azul, serra verde ao fundo, trilha demarcada, nenhum lixo, céu azul com nuvens',
    'a curved raised wooden boardwalk crossing coastal vegetation and coconut palms toward a pale-sand beach and blue sea, green hills behind, a marked trail, no litter, blue sky with clouds',
  ),
  'CC-033': s(
    'cena',
    'urbano',
    'orla urbana planejada em dia ensolarado, prédios altos modernos espaçados atrás de um calçadão arborizado, faixa larga de areia clara preservada, coqueiros, mar azul-turquesa com ondas, céu azul com nuvens',
    'a planned urban waterfront on a sunny day, tall modern buildings spaced behind a tree-lined promenade, a wide preserved strip of pale sand, coconut palms, turquoise sea with waves, blue sky with clouds',
  ),
  'CC-034': s(
    'cena',
    'solucao',
    'navio de pesquisa oceanográfica robusto com antena, mastro e guindaste, pesquisadores de colete no convés recolhendo equipamento, mar azul e céu azul claro com nuvens',
    'a sturdy oceanographic research ship with antenna, mast and crane, researchers in vests on deck handling equipment, blue sea and clear blue sky with clouds',
  ),
  'CC-035': s(
    'cena',
    'solucao',
    'conjunto de lixeiras coloridas (azul, verde, amarela e vermelha) numa praia limpa, uma pessoa separando recicláveis, sacos organizados, gaivotas ao fundo',
    'a set of colored bins (blue, green, yellow and red) on a clean beach, a person sorting recyclables, organized bags, gulls in the background',
  ),
  'CC-036': s(
    'cena',
    'comunidade',
    'educadora ambiental e jovens em círculo sobre as rochas observando uma poça de maré com lupa, estrela-do-mar e caranguejo visíveis na poça, luz dourada de lanterna',
    'an environmental educator and young people in a circle on the rocks examining a tide pool with a magnifying glass, starfish and crab visible in the pool, golden lantern light',
  ),
  'CC-037': s(
    'cena',
    'solucao',
    'técnico num píer coletando água com frasco e sonda multiparamétrica, mostrador com luz verde sem números, água turquesa translúcida',
    'a technician on a pier collecting water with a bottle and a multiparameter probe, a gauge with a green light and no numbers, translucent turquoise water',
  ),
  'CC-038': s(
    'personagem',
    'solucao',
    'fiscal ambiental de chapéu e colete em patrulha na praia, binóculo e lanterna, olhar atento, quadriciclo ao fundo, rastros sobre a areia, luz azulada com realces dourados',
    'an environmental inspector in a hat and vest patrolling the beach, binoculars and flashlight, attentive gaze, ATV in the background, tracks across the sand, blue light with golden highlights',
  ),
  'CC-039': s(
    'cena',
    'comunidade',
    'comunidade caiçara com casas simples de madeira à beira da praia, canoas de um tronco só na areia, redes de pesca secando, pessoas de diferentes idades conversando junto a uma fogueira, retrato digno e respeitoso',
    'a caiçara community with simple wooden houses by the beach, single-log canoes on the sand, fishing nets drying, people of different ages talking by a bonfire, a dignified and respectful portrayal',
  ),
  'CC-040': s(
    'cena',
    'solucao',
    'equipe plantando mudas de capim e vegetação de restinga numa duna, cercas baixas de madeira e passarelas protegendo o trecho, areia clara e céu azul com nuvens',
    'a crew planting grass and restinga vegetation on a dune, low wooden fences and walkways protecting the area, pale sand and blue sky with clouds',
  ),
  'CC-041': s(
    'cena',
    'solucao',
    'viveiro de mudas nativas com bandejas de mudas de mangue e restinga, mãos regando, luz dourada de lamparina, folhas verdes vibrantes',
    'a native seedling nursery with trays of mangrove and restinga seedlings, hands watering, golden lamp light, vibrant green leaves',
  ),
  'CC-042': s(
    'cena',
    'comunidade',
    'roda de pessoas diversas ao redor de uma maquete da costa sobre uma mesa de madeira, mãos apontando trechos do mapa, luz quente de lampião, litoral ao fundo',
    'a circle of diverse people around a model of the coast on a wooden table, hands pointing at parts of the map, warm lantern light, shoreline behind',
  ),
  'CC-043': s(
    'cena',
    'solucao',
    'corte transversal de uma rua costeira mostrando três redes integradas, tubulação de água limpa, tubulação de esgoto e galeria de drenagem, ligadas a uma estação de tratamento, cores turquesa e douradas',
    'a cross-section of a coastal street showing three integrated networks, clean water pipes, sewage pipes and a drainage gallery, linked to a treatment station, turquoise and gold colors',
  ),
  'CC-044': s(
    'cena',
    'ecossistema',
    'nascente cercada de mata nativa, água cristalina brotando entre pedras e musgo, cerca baixa de madeira protegendo o entorno, raios de sol entre as árvores',
    'a spring surrounded by native forest, crystal-clear water welling up between stones and moss, a low wooden fence protecting the surroundings, sunbeams between trees',
  ),
  'CC-045': s(
    'cena',
    'ecossistema',
    'margem de rio sendo replantada, fileira de mudas jovens e árvores maiores com raízes segurando o barranco, rio de água clara, enxada e cestos de mudas na margem',
    'a riverbank being replanted, a row of young seedlings and larger trees with roots holding the bank, clear river water, hoe and baskets of seedlings on the shore',
  ),
  'CC-046': s(
    'cena',
    'solucao',
    'torre de observação costeira com anemômetro, antena, painel solar e telescópio, apontada para o mar, farol distante, luzes douradas e turquesa nos instrumentos',
    'a coastal observatory tower with an anemometer, antenna, solar panel and telescope, pointed at the sea, distant lighthouse, golden and turquoise lights on the instruments',
  ),

  // ---------- Impactos (CC-047 a CC-072): criaturas sombrias que representam o fenômeno ----------
  'CC-047': s(
    'criatura',
    'impacto',
    'monstro de lixo, uma montanha de garrafas plásticas coloridas, pneu, latas e sacos formando uma criatura com boca de dentes pontiagudos e olhos laranja-brasa, fumaça e céu de tempestade roxo-escuro ao fundo, entulho no chão',
    'a trash monster, a mountain of colorful plastic bottles, tire, cans and bags forming a creature with a jagged-toothed mouth and ember-orange eyes, smoke and a dark purple storm sky behind, rubble on the ground',
  ),
  'CC-048': s(
    'criatura',
    'fenomeno',
    'falésia viva de rocha marrom-avermelhada cuja face esconde olhos de brasa, blocos de pedra e areia desmoronando, ondas violentas espumando na base, céu de pôr do sol laranja e roxo',
    'a living cliff of brown-red rock whose face hides ember eyes, blocks of stone and sand crumbling away, violent waves foaming at the base, orange and purple sunset sky',
  ),
  'CC-049': s(
    'criatura',
    'impacto',
    'criatura sombria de troncos cortados, tocos e galhos secos com fumaça subindo, clareira devastada ao fundo, olhos vermelho-brasa, sem glorificar a destruição',
    'a shadowy creature of cut logs, stumps and dry branches with smoke rising, a devastated clearing behind, ember-red eyes, without glorifying the destruction',
  ),
  'CC-050': s(
    'criatura',
    'fenomeno',
    'nuvem de tempestade escura com olhos de luz turquesa e raios, enxurrada de água marrom descendo por uma encosta, chuva pesada em linhas diagonais',
    'a dark storm cloud with glowing turquoise eyes and lightning bolts, a flood of brown water running down a slope, heavy diagonal rain',
  ),
  'CC-051': s(
    'criatura',
    'impacto',
    'criatura viscosa de lama marrom-esverdeada com tubulação quebrada como boca, bolhas tóxicas e espuma suja, saindo de um cano em direção à água, olhos vermelho-brasa',
    'a slimy creature of brown-green sludge with a broken pipe for a mouth, toxic bubbles and dirty foam, spilling from a pipe toward the water, ember-red eyes',
  ),
  'CC-052': s(
    'criatura',
    'impacto',
    'criatura feita de sacolas, copos, tampinhas, garrafas e fios de rede de pesca, flutuando em água escura, uma pequena tartaruga se afastando ao fundo, olhos vermelho-brasa',
    'a creature made of bags, cups, bottle caps, bottles and strands of fishing net, floating in dark water, a small turtle swimming away in the background, ember-red eyes',
  ),
  'CC-053': s(
    'criatura',
    'impacto',
    'estrutura precária de palafitas e blocos improvisados erguida sobre uma margem instável de encosta, rachaduras e barranco cedendo, formando uma silhueta ameaçadora; representar o risco da área frágil, sem pessoas e sem culpar moradores',
    'a precarious structure of stilts and improvised blocks built on an unstable slope edge, cracks and a collapsing bank forming a menacing silhouette; depict the risk of a fragile area, with no people and without blaming residents',
  ),
  'CC-054': s(
    'criatura',
    'impacto',
    'criatura de redes de arrasto e anzóis, rede enorme como boca arrastando o fundo, peixes pequenos presos nas malhas, olhos vermelho-brasa, mar escuro',
    'a creature of trawl nets and hooks, an enormous net as a mouth dragging the seabed, small fish caught in the mesh, ember-red eyes, dark sea',
  ),
  'CC-055': s(
    'criatura',
    'impacto',
    'criatura de lama e areia acumulada bloqueando um canal raso, bancos de lodo marrom e barcos encalhados ao fundo, olhos vermelho-brasa, água turva',
    'a creature of mud and piled-up sand blocking a shallow channel, brown mudbanks and stranded boats in the background, ember-red eyes, murky water',
  ),
  'CC-056': s(
    'criatura',
    'impacto',
    'criatura viscosa de petróleo negro com reflexos iridescentes e tentáculos se espalhando sobre a água, gotas escuras, mancha na superfície, olhos vermelho-brasa',
    'a viscous creature of black oil with iridescent sheen and tentacles spreading over the water, dark droplets, a slick on the surface, ember-red eyes',
  ),
  'CC-057': s(
    'criatura',
    'fenomeno',
    'grande onda azul-escura curvada em forma de criatura com olhos brancos brilhantes, crista de espuma branca em pixels e gotas voando, céu de tempestade',
    'a huge dark blue wave curled into the shape of a creature with glowing white eyes, a crest of white pixel foam and flying droplets, stormy sky',
  ),
  'CC-058': s(
    'criatura',
    'impacto',
    'colosso de guindastes, contêineres e cascos de ferro projetando sombra sobre uma baía, luzes industriais alaranjadas, olhos vermelho-brasa nas cabines dos guindastes',
    'a colossus of cranes, containers and iron hulls casting a shadow over a bay, orange industrial lights, ember-red eyes in the crane cabins',
  ),
  'CC-059': s(
    'criatura',
    'impacto',
    'criatura nebulosa formada por miríades de minúsculos fragmentos coloridos de plástico suspensos na água, zooplâncton ao redor, olhos pequenos vermelho-brasa, água azul-escura',
    'a nebulous creature formed by myriads of tiny colorful plastic fragments suspended in water, zooplankton around it, small ember-red eyes, dark blue water',
  ),
  'CC-060': s(
    'criatura',
    'impacto',
    'criatura de asfalto e concreto escaldante, ondas de calor distorcendo o ar, janelas como olhos vermelho-brasa, pouca vegetação murcha aos pés, céu alaranjado ao fundo',
    'a creature of scorching asphalt and concrete, heat waves distorting the air, windows as ember-red eyes, little wilted vegetation at its feet, orange sky behind',
  ),
  'CC-061': s(
    'criatura',
    'impacto',
    'criatura de bueiro entupido com água da rua transbordando, tampas de bueiro e lixo no corpo, rua alagada refletindo luzes, olhos vermelho-brasa',
    'a creature of a clogged storm drain with street water overflowing, manhole covers and litter on its body, a flooded street reflecting lights, ember-red eyes',
  ),
  'CC-062': s(
    'criatura',
    'impacto',
    'criatura de areia nua e vegetação arrancada, tocos e raízes secas no corpo, solo exposto e vento levantando areia, olhos vermelho-brasa, resto de restinga ao fundo',
    'a creature of bare sand and uprooted vegetation, stumps and dry roots on its body, exposed soil and wind lifting sand, ember-red eyes, remnant restinga behind',
  ),
  'CC-063': s(
    'criatura',
    'impacto',
    'criatura de lixo de praia lotada, guarda-sóis quebrados, sacos, copos e pegadas de veículos na areia, sombra pesada sobre uma duna, olhos vermelho-brasa, sem retratar turistas como vilões',
    'a creature of crowded-beach litter, broken umbrellas, bags, cups and vehicle tracks in the sand, a heavy shadow over a dune, ember-red eyes, without portraying tourists as villains',
  ),
  'CC-064': s(
    'criatura',
    'impacto',
    'criatura de espinhas e ossos de peixe e redes vazias, mar esvaziado com um cardume minguado ao fundo, olhos vermelho-brasa, água escura',
    'a creature of fish bones and empty nets, an emptied sea with a dwindled school in the background, ember-red eyes, dark water',
  ),
  'CC-065': s(
    'criatura',
    'impacto',
    'criatura de concreto e vigas de ferro expostas esmagando uma duna, betoneira abandonada, vegetação de duna soterrada, olhos vermelho-brasa, areia desmoronando',
    'a creature of concrete and exposed rebar crushing a dune, an abandoned concrete mixer, buried dune vegetation, ember-red eyes, sand collapsing',
  ),
  'CC-066': s(
    'criatura',
    'impacto',
    'criatura de manilhas e calhas de concreto, um rio retificado e aprisionado em canal reto, margens sem vegetação, olhos vermelho-brasa, água corrente forçada',
    'a creature of concrete pipes and channels, a straightened river trapped in a straight canal, banks without vegetation, ember-red eyes, forced running water',
  ),
  'CC-067': s(
    'criatura',
    'impacto',
    'peixe-leão invasor listrado de vermelho e branco com nadadeiras em leque e espinhos abertos ocupando o quadro, fundo azul profundo com bolhas e pequenos peixes nativos se afastando',
    'an invasive lionfish striped red and white with fanned fins and open spines filling the frame, deep blue background with bubbles and small native fish swimming away',
  ),
  'CC-068': s(
    'criatura',
    'impacto',
    'criatura de barris e tubulações vazando efluente verde-neon tóxico, chaminé industrial soltando fumaça ao fundo, poça brilhante no chão, olhos vermelho-brasa',
    'a creature of barrels and pipes leaking toxic neon-green effluent, an industrial chimney smoking behind, a glowing puddle on the ground, ember-red eyes',
  ),
  'CC-069': s(
    'criatura',
    'impacto',
    'draga mecânica monstruosa com garras de aço revolvendo o fundo, nuvem densa de sedimento turvo subindo na água, olhos vermelho-brasa, peixes fugindo',
    'a monstrous mechanical dredger with steel claws churning the seabed, a dense cloud of murky sediment rising in the water, ember-red eyes, fish fleeing',
  ),
  'CC-070': s(
    'criatura',
    'impacto',
    'coral pálido-esbranquiçado, esqueletal como osso, com poucos pontos de cor restantes, água clara demais e quente com sol forte, aparência de criatura enfraquecida de olhos vermelho-brasa',
    'a pale bleached bone-like coral with only a few remaining spots of color, water too clear and warm under a harsh sun, a weakened creature look with ember-red eyes',
  ),
  'CC-071': s(
    'criatura',
    'fenomeno',
    'maré alta como gigante azul-escuro se erguendo devagar, água invadindo um calçadão costeiro, linhas de nível marcadas em postes, olhos de luz turquesa',
    'a high tide as a slow-rising dark blue giant, water invading a coastal promenade, level marks on posts, glowing turquoise eyes',
  ),
  'CC-072': s(
    'criatura',
    'impacto',
    'criatura de algas verde-neon em floração sobre água turva e esverdeada, espuma densa, peixes sem cor ao fundo, olhos vermelho-brasa',
    'a creature of neon-green blooming algae over murky greenish water, dense foam, faded fish in the background, ember-red eyes',
  ),

  // ---------- Ações instantâneas (CC-073 a CC-084) ----------
  'CC-073': s(
    'cena',
    'solucao',
    'estação de tratamento de esgoto costeira em dia ensolarado, grandes tanques circulares de água azul purificada com braços raspadores, prédios administrativos, vegetação e montanhas com baía ao fundo, céu azul com nuvens',
    'a coastal sewage treatment plant on a sunny day, large circular tanks of purified blue water with scraper arms, administrative buildings, vegetation and mountains with a bay behind, blue sky with clouds',
  ),
  'CC-074': s(
    'cena',
    'ecossistema',
    'mudas jovens de mangue plantadas em fileira em água rasa ao pôr do sol dourado, reflexos alaranjados na água, brotos verdes viçosos e algumas árvores secas ao fundo mostrando a área em recuperação',
    'young mangrove seedlings planted in a row in shallow water at golden sunset, orange reflections on the water, lush green sprouts and a few dead trees behind showing the area being recovered',
  ),
  'CC-075': s(
    'cena',
    'solucao',
    'drone de fiscalização sobrevoando a costa com feixe turquesa, fiscais numa lancha observando, mancha suspeita na água sendo identificada, céu azul de fim de tarde',
    'an inspection drone flying over the coast with a turquoise beam, inspectors on a boat watching, a suspicious patch in the water being identified, blue late-afternoon sky',
  ),
  'CC-076': s(
    'cena',
    'comunidade',
    'mutirão de pessoas recolhendo resíduos numa praia ao amanhecer, sacos de lixo cheios organizados, luvas, pegadas na areia, mar limpo ao fundo',
    'a group of people collecting litter on a beach at dawn, full organized trash bags, gloves, footprints in the sand, clean sea behind',
  ),
  'CC-077': s(
    'cena',
    'fenomeno',
    'torre de salva-vidas com luz de alerta âmbar e bandeira de aviso enquanto grandes ondas se formam no horizonte, areia vazia, nuvens escuras e relâmpagos distantes',
    'a lifeguard tower with an amber warning light and a warning flag while big waves build on the horizon, empty sand, dark clouds and distant lightning',
  ),
  'CC-078': s(
    'objeto',
    'solucao',
    'maquete tridimensional da costa sobre mesa com zonas coloridas de uso do solo, compasso e régua de bronze, luz dourada de lamparina, mapa ao fundo sem escrita',
    'a three-dimensional model of the coast on a table with colored land-use zones, brass compass and ruler, golden lamp light, a map behind with no writing',
  ),
  'CC-079': s(
    'simbolo',
    'solucao',
    'megafone dourado emitindo pictogramas luminosos, uma onda, uma tartaruga e uma árvore, sobre fundo azul com pessoas em silhueta ouvindo, sem letras',
    'a golden megaphone emitting glowing pictograms, a wave, a turtle and a tree, on a blue background with silhouetted people listening, no letters',
  ),
  'CC-080': s(
    'cena',
    'comunidade',
    'pessoas de várias idades plantando mudas juntas numa praia ao amanhecer, mãos unidas segurando uma muda, cestos de mudas, luz dourada, retrato caloroso',
    'people of various ages planting seedlings together on a beach at dawn, joined hands holding a seedling, baskets of seedlings, golden light, a warm portrayal',
  ),
  'CC-081': s(
    'objeto',
    'solucao',
    'barreira flutuante laranja em arco cercando uma mancha escura na água, barcos de apoio nas pontas, boias reluzentes, mar calmo',
    'an orange floating barrier arcing around a dark patch on the water, support boats at the ends, shining buoys, calm sea',
  ),
  'CC-082': s(
    'simbolo',
    'solucao',
    'balança dourada com uma folha verde de um lado e um prédio do outro, lupa sobre um mapa da costa ao fundo, prancheta, luz de lamparina, sem letras nem números',
    'a golden scale with a green leaf on one side and a building on the other, a magnifying glass over a coastal map behind, clipboard, lamp light, no letters or numbers',
  ),
  'CC-083': s(
    'objeto',
    'solucao',
    'boia de monitoramento no mar com painel solar e antena, linhas luminosas de dados saindo em ondas turquesa, ondas, gráfico luminoso sem números',
    'a monitoring buoy at sea with a solar panel and antenna, luminous data lines streaming out in turquoise waves, waves, a glowing graph with no numbers',
  ),
  'CC-084': s(
    'paisagem',
    'ecossistema',
    'vista aérea de uma bacia hidrográfica, serra coberta de mata, rio serpenteando com mata ciliar, pequenos reservatórios, desembocando no mar ao fundo, luz clara de dia',
    'an aerial view of a river basin, forested mountains, a winding river with riparian forest, small reservoirs, flowing into the sea in the background, clear daylight',
  ),

  // ---------- Equipamentos (CC-085 a CC-088) ----------
  'CC-085': s(
    'objeto',
    'equipamento',
    'manto de raízes de mangue entrelaçadas como armadura orgânica, brilho verde e turquesa percorrendo as raízes, folhas pequenas, exposto como relíquia em destaque',
    'a cloak of interwoven mangrove roots as organic armor, green and turquoise glow running through the roots, small leaves, displayed as a relic',
  ),
  'CC-086': s(
    'objeto',
    'equipamento',
    'módulo tecnológico compacto com painel solar, pequena turbina eólica e filtro cilíndrico, brilho turquesa, metal escuro com detalhes dourados, exposto como equipamento de coleção',
    'a compact technology module with a solar panel, small wind turbine and cylindrical filter, turquoise glow, dark metal with golden details, displayed as a collectible equipment piece',
  ),
  'CC-087': s(
    'objeto',
    'equipamento',
    'drone de vigilância com câmera e luzes turquesa pairando sobre a costa, feixe de luz varrendo a água, binóculo preso ao corpo, céu de fim de tarde',
    'a surveillance drone with a camera and turquoise lights hovering over the coast, a light beam sweeping the water, binoculars attached to its body, late-afternoon sky',
  ),
  'CC-088': s(
    'objeto',
    'equipamento',
    'casa em palafita moderna elevada sobre a maré, telhado de captação de água, jardim de mangue e muro-verde ao redor, adaptada à maré alta, luzes douradas nas janelas',
    'a modern elevated stilt house above the tide, a rainwater-collecting roof, mangrove garden and green wall around it, adapted to high tides, golden lights in the windows',
  ),

  // ---------- Terrenos (CC-089 a CC-092) ----------
  'CC-089': s(
    'paisagem',
    'ecossistema',
    'panorama amplo de manguezal, raízes escora em primeiro plano, canais de maré e copa densa, aves em voo, água azul com brilho turquesa',
    'a wide panorama of a mangrove, stilt roots in the foreground, tidal channels and dense canopy, birds in flight, blue water with turquoise glow',
  ),
  'CC-090': s(
    'paisagem',
    'urbano',
    'orla urbana em dia ensolarado com prédios, calçadão, canais de drenagem, árvores e um trecho de praia, reflexos na água, céu azul com nuvens',
    'an urban waterfront on a sunny day with buildings, promenade, drainage channels, trees and a stretch of beach, reflections on the water, blue sky with clouds',
  ),
  'CC-091': s(
    'paisagem',
    'fenomeno',
    'mar aberto com ondas largas e horizonte distante, cardume sob a superfície em brilho turquesa, pequeno barco ao longe, nuvens iluminadas',
    'open sea with broad waves and a distant horizon, a school of fish under the surface glowing turquoise, a small boat far away, lit clouds',
  ),
  'CC-092': s(
    'paisagem',
    'fenomeno',
    'costa ressecada sob pressão, solo rachado, árvores secas sem folhas, rochas escuras, sol vermelho enorme se pondo sobre o mar, céu laranja e vermelho dramático',
    'a parched pressured coast, cracked soil, dry leafless trees, dark rocks, a huge red sun setting over the sea, dramatic orange and red sky',
  ),

  // ---------- Armadilhas (CC-093 a CC-100) ----------
  'CC-093': s(
    'simbolo',
    'armadilha',
    'feixe de holofote iluminando de surpresa uma mancha suspeita de despejo numa água escura, silhueta de fiscal com binóculo na margem, sombras roxas e dourado de alerta',
    'a spotlight beam suddenly lighting a suspicious dumping patch in dark water, an inspector silhouette with binoculars on the shore, purple shadows and warning gold',
  ),
  'CC-094': s(
    'simbolo',
    'armadilha',
    'parede viva de mangue e recife emergindo da água e absorvendo uma onda grande, espuma se dispersando nas raízes, brilho roxo e turquesa de proteção',
    'a living wall of mangrove and reef rising from the water and absorbing a big wave, foam dispersing in the roots, purple and turquoise protective glow',
  ),
  'CC-095': s(
    'simbolo',
    'armadilha',
    'mapa tático de emergência numa mesa com rota luminosa de evacuação, kit de emergência aberto e lanterna, luz dourada de alerta sobre fundo roxo-escuro, sem escrita',
    'a tactical emergency map on a table with a glowing evacuation route, an open emergency kit and flashlight, golden warning light on dark purple, no writing',
  ),
  'CC-096': s(
    'simbolo',
    'armadilha',
    'antena e radar de previsão do tempo com varredura luminosa, sirene de alerta e tempestade com raios se aproximando no horizonte, tons roxos e dourados',
    'a weather forecast antenna and radar with a glowing sweep, a warning siren and a storm with lightning approaching on the horizon, purple and golden tones',
  ),
  'CC-097': s(
    'simbolo',
    'armadilha',
    'silhueta de pessoa fotografando um despejo suspeito na água com um celular, feixe de luz do celular iluminando a mancha, pictograma luminoso de balão de fala, tons roxos',
    'a silhouette of a person photographing a suspicious discharge in the water with a phone, the phone light beam illuminating the patch, a glowing speech-bubble pictogram, purple tones',
  ),
  'CC-098': s(
    'simbolo',
    'armadilha',
    'grupo de moradores em silhueta com binóculos, cadernos e celulares registrando observações numa praia, uma ave pousada em destaque, brilho roxo e dourado',
    'a group of residents in silhouette with binoculars, notebooks and phones recording observations on a beach, a perched bird in focus, purple and golden glow',
  ),
  'CC-099': s(
    'simbolo',
    'armadilha',
    'escudo de energia turquesa e dourada cobrindo uma enseada, barreiras de contenção flutuantes e equipe de resgate em silhueta, céu roxo-escuro',
    'a turquoise and golden energy shield covering a cove, floating containment barriers and a rescue crew in silhouette, dark purple sky',
  ),
  'CC-100': s(
    'simbolo',
    'armadilha',
    'rede luminosa tecida de fios dourados e turquesa ligando um manguezal, um recife, um barco e uma casa, nós brilhantes, fundo roxo-escuro',
    'a luminous net woven of golden and turquoise threads linking a mangrove, a reef, a boat and a house, glowing knots, dark purple background',
  ),
}
