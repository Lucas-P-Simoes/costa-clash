// Histórias (lore) exibidas no modal ao escolher um adversário. Texto narrativo PROVISÓRIO, aguardando revisão do
// responsável pelo projeto. Personagens são fictícios; as afirmações ambientais devem permanecer defensáveis
// (nada "elimina" um risco por completo).

export const HISTORIAS_OPONENTES: Readonly<Record<string, readonly string[]>> = {
  'guardiao-manguezal': [
    'Dizem que o Guardião nasceu entre as raízes de um manguezal tão antigo que a maré já o conhecia pelo nome. Nunca saiu dali: seus pés são raízes e seus cabelos, folhas.',
    'Ele sabe que o manguezal é berçário de muitos peixes, caranguejos e aves, e que suas raízes ajudam a segurar o sedimento na beira da água.',
    'Quem chega com pressa e deixa lixo na lama enfrenta a sua paciência. Prove que respeita a costa, ou as raízes não vão deixar você passar.',
  ],
  'fiscal-ambiental': [
    'Todo amanhecer, a Fiscal percorre a orla com um caderno de anotações e um olhar que não deixa nada passar. Ela aprendeu que regras só protegem a natureza quando alguém as faz valer.',
    'Seu trabalho é conversar, orientar e, quando preciso, autuar quem descumpre a lei. Ela prefere explicar a punir, mas não hesita diante de abusos.',
    'Para ela, você é só mais um visitante a ser observado. Mostre que conhece as regras da costa antes de tentar passar.',
  ],
  'pescador-tradicional': [
    'Seu Anselmo lê o céu e a maré como outros leem jornal. Aprendeu a pescar com o pai e hoje ensina aos netos a respeitar o tempo certo de cada peixe.',
    'Ele sabe que pescar demais e em época errada esvazia o mar, e que respeitar o período de defeso ajuda os estoques a se recuperarem.',
    'Seu Anselmo não duela por orgulho, mas pelo sustento e pelo futuro do mar. Mostre que pescar e conservar podem andar juntos.',
  ],
  'tartaruga-marinha': [
    'Há mais de cinquenta anos, uma tartaruga marinha cruza o oceano para voltar à praia onde nasceu. Cada viagem é longa, e cada ninho depende de uma areia tranquila.',
    'Luzes fortes, lixo e veículos na praia atrapalham as desovas e desorientam os filhotes. Várias espécies de tartarugas marinhas estão ameaçadas.',
    'Ela defende o ninho com a calma de quem viu muito mar. Se quiser passar, mostre que a praia pode ser compartilhada com cuidado.',
  ],
  'poluicao-mar': [
    'Garrafas, sacolas, redes perdidas e restos de toda sorte se juntaram numa correnteza e formaram uma criatura que ninguém queria criar.',
    'A Poluição do Mar nasceu do descuido de muita gente, um pouco de cada vez. Plástico e outros resíduos podem ferir animais e contaminar a água.',
    'Ela cresce a cada descarte errado. Cada vitória sua mostra que o caminho de volta existe: reduzir, reaproveitar e destinar corretamente o lixo.',
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
  restinga: [
    'Entre o mar e a mata, a Restinga cuida das dunas com flores no cabelo e olhos fechados, como quem escuta o vento passar pela areia.',
    'A vegetação de restinga ajuda a fixar a areia e abriga plantas e animais próprios do litoral. Pisoteio e ocupação podem danificar esse ambiente frágil.',
    'Ela é calma, mas não deixa ninguém pisar à toa. Prove que sabe caminhar sem machucar o que cresce sobre a areia.',
  ],
  coral: [
    'No fundo do mar, onde a luz chega azul, o Coral construiu uma cidade vermelha e laranja, lar de peixes, camarões e muitas outras criaturas.',
    'Recifes de coral abrigam grande diversidade de vida marinha, mas são sensíveis. O aquecimento da água, a poluição e a pisada de visitantes podem causar branqueamento e danos.',
    'Ele é lento para crescer e rápido para se ofender. Seja gentil com o recife, ou aprenda do jeito difícil.',
  ],
  'chuva-intensa': [
    'Uma nuvem escura se juntou sobre a serra e ficou ali, trovejando e juntando raiva. A Chuva Intensa despeja tudo de uma vez.',
    'Chuvas fortes podem causar enchentes e deslizamentos, além de levar lixo, esgoto e sedimentos pelos rios até o mar.',
    'Ela passa depressa, mas deixa rastro. Cuidar de rios, encostas e drenagem ajuda a diminuir o estrago.',
  ],
  porto: [
    'O Capataz do Porto conhece cada guindaste e cada navio que atraca. Para ele, o cais nunca dorme: cargas chegam e partem em qualquer hora.',
    'Portos movimentam a economia e geram empregos, mas exigem gestão cuidadosa de resíduos, de dragagem e do tráfego de navios, para reduzir danos à vida marinha.',
    'Ele não é inimigo do mar, só tem pressa. Mostre que dá para trabalhar no cais cuidando da água.',
  ],
  'comunidade-caicara': [
    'Na vila à beira da baía, as canoas descansam na areia e as histórias passam de avô para neto. A Comunidade Caiçara vive ali há muitas gerações.',
    'O modo de vida caiçara costuma envolver pesca artesanal e, em muitos casos, agricultura em pequena escala e extrativismo, com saberes tradicionais sobre o território.',
    'Quem vem de fora precisa pedir licença. Ouça o que a comunidade sabe sobre o lugar, e o duelo será de igual para igual.',
  ],
  'recuperacao-ambiental': [
    'Onde antes só havia terra nua, ela plantou a primeira muda. Hoje, a Recuperação Ambiental caminha por áreas que já foram degradadas e agora voltam a ficar verdes.',
    'Replantar vegetação nativa, proteger nascentes e retirar espécies invasoras ajuda a restaurar áreas degradadas, mas o processo leva anos e exige acompanhamento.',
    'Ela é paciente e persistente. Para vencê-la, é preciso mostrar que também sabe cuidar do que foi perdido.',
  ],
  'planejamento-costeiro': [
    'Com mapas, gráficos e uma xícara de café, o Planejador desenha como a orla deve ser usada nos próximos anos, antes que os problemas apareçam.',
    'Planejar o uso da costa com base em dados ajuda a reduzir conflitos entre moradia, turismo, pesca e conservação, e a diminuir riscos para pessoas e ecossistemas.',
    'Ele acredita que decisões bem pensadas valem mais que pressa. Mostre que sua estratégia aguenta a maré.',
  ],
  'biodiversidade-costeira': [
    'A Garça Branca observa tudo do alto: manguezais, restingas, estuários e recifes. Cada lugar tem seus peixes, aves e plantas, e todos dependem uns dos outros.',
    'A variedade de espécies do litoral contribui para o funcionamento dos ambientes costeiros, e a perda de habitat pode reduzi-la.',
    'Ela pousa com elegância e luta com precisão. Se quiser passar, respeite cada elo dessa teia.',
  ],
  'oceano-limpo': [
    'No fim da jornada, onde a água é clara e a lua se reflete sem sombra, está o Guardião do Oceano Limpo, de tridente em punho e barba azul como a maré.',
    'Ele representa tudo o que você aprendeu: reduzir a poluição, proteger habitats, respeitar quem vive do mar e planejar a costa com cuidado. Um oceano saudável depende de muitas ações, e não de uma só.',
    'Este é o último duelo. Mostre que a costa está em boas mãos.',
  ],
}

export function historiaDoOponente(id: string): readonly string[] {
  return HISTORIAS_OPONENTES[id] ?? []
}
