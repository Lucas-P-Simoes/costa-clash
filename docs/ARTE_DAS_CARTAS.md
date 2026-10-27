# Arte das cartas — guia de estilo, geração e integração

> **Catálogo ilustrado em 2026-10-25.** Foram geradas 95 ilustrações novas com o ImageGen integrado ao Codex, usando os prompts individuais do catálogo e as 5 imagens existentes apenas como referência de estilo. As novas artes estão no estado **gerada** (aguardam aprovação do dono). Os 5 arquivos originais continuam **provisórios**, sem alteração.

## 1. Estilo obrigatório (referência principal: `Estilos-de-cartas.webp`)
Pixel art retrô estilo PlayStation 1 / 16-bit moderno, aparência de carta colecionável:
- **Cena completa** preenchendo todo o quadro (não ícones soltos), com **elemento principal grande e centralizado**, primeiro plano, plano médio e fundo.
- Contornos escuros finos e definidos; cores vibrantes e saturadas, harmonizadas (contraste de laranja quente com azul-turquesa); sombras profundas; pixels visíveis com dithering sutil; alta densidade de detalhes.
- Iluminação dramática: raios de luz subaquáticos, pôr do sol dourado/laranja/roxo, céu azul com nuvens brancas em pixels (dia), tempestade roxa (impactos). A noite azul-lunar das telas do jogo continua válida para armadilhas e cenas específicas.

**Proibido:** fotografia, realismo, genérico, estilo infantil simplificado, emojis, ícones de biblioteca, estilos misturados, e qualquer **texto, nome, ATK/DEF, moldura, selo ou logotipo dentro da imagem** (a moldura, o selo e a placa de nome são desenhados pelo jogo).

### DNA visual observado (aproximado)
- Fundos escuros de interface: `#07101a`, `#0e1a28`, `#0e2a3d`. Água/ceu: `#1f6f9c`, `#3fdcf0` (turquesa), `#8fe8f5` (realce), `#4aa8e8` (céu).
- Verdes de folhagem `#1f6e3a` `#37b05f` `#b8d430`; raízes e madeira `#8a5a2c` `#5a3a1a`; areia `#e8d49a`.
- Quentes: dourado `#e6b648` `#f2cf6e`, laranja `#e8803a`, coral `#f0a63a` `#e0603a`; impactos: roxo `#2a1a40` `#8a5ac4`, cinza `#6a6a72`, brasa `#e0602a` nos olhos.
- Densidade: as ilustrações da referência têm ~275x300 px por janela de arte e leitura de pixel grande (grade lógica equivalente a ~256 px de largura ampliada 3x para 768). Aparência "pixel art pintada", com gradientes suaves e dithering leve, não pixel-perfeito rígido.
- Esse DNA é o prefixo comum de todos os prompts (`PREFIXO_ESTILO` em `src/arte/prompts.ts`).

### Moldura, selo e placa (desenhados pelo jogo, `CartaView`)
Borda colorida por categoria, **selo octogonal no canto superior esquerdo** com pictograma em pixel art, **placa escura de nome na base da arte**, e ATK/DEF (ou tipo + efeito) abaixo, como em `Motor-Duelo.png`. Mapa em `src/arte/categorias.ts` (dados puros e testados; ajustes por carta no mesmo arquivo):

| Categoria | Borda | Selo | Temas |
|---|---|---|---|
| marinha | azul `#3b82d6` | gota | vida marinha (padrão de Fauna) |
| verde | verde `#2f9e54` | folha | ecossistemas, fauna costeira, restauração, turismo sustentável |
| fenomeno | vermelho `#c4402a` | triângulo / termômetro | fenômenos naturais, recifes, mudanças climáticas |
| impacto | roxo `#8a4ac4` | diabinho / caveira | impactos ambientais, espécies exóticas |
| protegida | cinza `#8e9aa6` | concha / engrenagem | restinga, áreas protegidas, saneamento, equipamentos, armadilhas |
| planejamento | dourado `#e0a82e` | estrela | planejamento, pesquisa, ações |
| ondas | azul-ondas `#2ab4e8` | onda | comunidades tradicionais, ressaca, mobilização |

Padrão por tipo+grupo: ecossistema=verde, fauna=marinha, atividade=planejamento, impacto=impacto, ação=planejamento, equipamento=protegida, terreno=verde, armadilha=protegida; mais ~40 ajustes por carta (ex.: CC-018 marinha/gota; CC-047 impacto/diabinho; CC-073 protegida/engrenagem). A atribuição das 100 cartas a categorias é uma **proposta do DEV** para o dono revisar (só apresentação).

## 2. Requisitos técnicos da imagem
- **Vertical 3:4, preferencial 768x1024**; mínimo 384x512; PNG ou WebP; ideal < 1,5 MB (erro acima de 5 MB).
- Sem texto, nome, ATK/DEF, moldura, selo nem logotipo.
- Nome estável pelo número do ID: `CC-018` -> `018.webp` (ou `018.png`), em `public/assets/cards/art/`.
- **Janela de arte do jogo NÃO é 3:4.** Medida (Chrome, duelo): `.carta__arte` tem largura 100–124 px e altura 57–126 px conforme tamanho de carta/viewport (desktop 112x152: 100x57..85; tablet/paisagem 136x196: 124x97..126; celular 118x176: 106x82..106). Proporção real **entre ~1:1 e ~1,75:1 (paisagem)**. A imagem usa `object-fit: cover`, então a largura aparece inteira e só a **faixa central da altura** é visível: de ~43% (pior caso) a ~76%.
- **Margem de segurança:** elemento principal e tudo que importa dentro da **faixa central de 25% a 75% da altura** e a **10% de margem lateral**; detalhes decorativos podem ficar fora. `object-position: center 45%`. (Considere ampliar a janela de arte no redesenho do tabuleiro: na referência ela é ~0,93:1.)

## 3. Paleta por tipo
| Paleta | Uso | Cores |
|---|---|---|
| ecossistema | ecossistemas | verdes, azuis, tons naturais, luz dourada |
| vidaMarinha | fauna e vida marinha | azuis e turquesas, raios de luz, acentos de coral |
| impacto | impactos | roxos, preto-azulado, cinza, brasa nos olhos |
| fenomeno | fenômenos | azuis profundos, cinzas de tempestade, espuma, energia turquesa |
| solucao | planejamento e soluções | dourado, verdes, turquesa tecnológico, céu limpo |
| comunidade | comunidades tradicionais | madeira, palha, areia, azul-mar, pôr do sol |
| urbano | orla/terreno urbano | azul-céu, concreto claro, janelas douradas, verde |
| equipamento | equipamentos | metal escuro azulado, dourado, turquesa |
| armadilha | armadilhas | roxo místico, dourado de alerta, turquesa |

Textos completos e hex em `PALETAS` (`src/arte/prompts.ts`).

## 4. Conteúdo ambientalmente defensável
- Conceitos reconhecíveis (manguezal com raízes escora, restinga com flores, tanques de tratamento etc.).
- Impactos viram criaturas/fenômenos sombrios que **representam o fenômeno**, sem apologia e **sem demonizar pessoas** (ex.: ocupação irregular = estrutura precária em área frágil, sem moradores).
- Soluções e ações **nunca sugerem que eliminam totalmente um risco** (teste automático nos sujeitos).
- Comunidades tradicionais (pescador artesanal, caiçara): retrato digno e respeitoso, sem estereótipos ou caricatura; embarcações e ferramentas reais.

## 5. Arquivos
- `src/arte/sujeitos.ts`: **100 sujeitos escritos à mão** (PT e EN), forma de composição e paleta por ID. Os do estilo da referência (tartaruga sobre recife com raios de luz, mangue com raízes, falésia com ondas, monstro de lixo, restinga com flores, onda-criatura, orla urbana, estação de tratamento, garça no mangue, barco com rede, recife de coral, peixe-leão, mudas de mangue, golfinhos, navio de pesquisa, ilha rochosa, passarela) foram ajustados para cenas ricas.
- `src/arte/prompts.ts`: gerador determinístico (prefixo + assunto + paleta e luz + composição + negativos; termina com "Sem texto, sem moldura, sem ATK/DEF, sem logotipo."). Também em inglês.
- `src/arte/{categorias,manifesto,arteDisponivel,piloto,referencia}.ts`, `src/arte/indiceArte.json` (índice do build).
- `scripts/arte/*.mjs` e `scripts/{arte-manifesto,arte-verificar,arte-prompts,gerar-arte}.mjs` (Node 22.18+/24; carregam os `.ts` por remoção de tipos).
- `public/assets/cards/art/manifest.json`: 100 entradas (id, nome, arquivo, estado, prompt, promptHash, promptHashGerado, origem, observacao, verificacao{largura, altura, bytes, sha256}).
- `docs/arte/lote-piloto.md` + `prompts-piloto.json` (5 pilotos), `prompts-catalogo.{md,json}` (100), `candidatos-referencia.md`.

## 6. Estados e regras do manifesto
`pendente | provisoria | gerada | aprovada | rejeitada`.
- **provisoria** (novo): recorte/rascunho só para avaliar estilo, nunca final; o verificador aceita com avisos de resolução/proporção. Hoje: as 5 pilotos (`origem = "recorte de Referencia-telas/Estilos-de-cartas.webp"`).
- **gerada**: arquivo existe, aguarda aprovação. Hoje: 95 cartas. **aprovada**: só o dono; **nunca é substituída** (o gerador a pula mesmo com `--forcar`; o sincronizador mantém o registro e acusa erro se o arquivo mudar; o verificador falha se o sha256 mudar). Aprovar: `npm run arte:manifesto -- --marcar CC-002 --estado aprovada --autorizado-pelo-dono`.
- Colocou arquivo novo manualmente? `arte:manifesto` marca `gerada` e registra sha256/dimensões.

## 7. Comandos
- `npm run arte:manifesto` sincroniza manifesto e índice (preserva estados/hashes); `-- --check` só confere; `-- --marcar CC-001 --estado provisoria --origem "..." --observacao "..."`.
- `npm run arte:verificar`: PNG/WebP válidos, 3:4, dimensão, tamanho, duplicados por sha256, nomes x IDs, ausentes. Hoje: 0 pendentes, 5 provisórias e 95 geradas; resultado **OK com 10 avisos**, todos esperados das provisórias. As 95 novas artes são WebP 768x1024 (3:4), entre aproximadamente 211 e 413 KiB cada. As 5 provisórias mantêm os avisos de resolução/proporção.
- `npm run arte:prompts`: reexporta os prompts em `docs/arte/`.
- `npm run arte:gerar -- --lote piloto | --ids CC-001,CC-018 | --proximos 10 [--executar] [--forcar]`: **dry-run por padrão** (imprime prompts, quantidade e custo; não chama API). Só chama o provedor com `--executar`; só gera `pendente`; pula `aprovada` sempre e existente sem `--forcar`; recusa e não salva imagem fora de 3:4/mínimo; grava `NNN.png|webp`; marca `gerada` com sha256/bytes/dimensões e `promptHashGerado`. Esse script não foi usado na geração de 2026-10-25; as imagens vieram do ImageGen integrado ao Codex e foram sincronizadas depois com `arte:manifesto`.

## 8. Geração realizada e próximos passos
1. Em 2026-10-25, o Codex gerou uma imagem separada para cada uma das 95 cartas antes pendentes. Cada prompt combinou a descrição individual do manifesto com o DNA visual das cinco referências, proibindo texto, moldura, selo e reutilização dos assuntos das referências.
2. O dono ainda precisa revisar e marcar cada candidata como `aprovada` ou `rejeitada`; nenhuma foi aprovada automaticamente. A inspeção do Codex foi amostral, não uma revisão artística completa.
3. As 5 cartas originais (`CC-001`, `CC-018`, `CC-031`, `CC-047`, `CC-073`) permanecem provisórias e podem ser regeneradas depois sem afetar as 95 novas.
4. Em 2026-10-27, as 95 PNGs de 1086x1448 foram redimensionadas mecanicamente para WebP 768x1024 com Sharp/libvips (Lanczos3, qualidade 90, esforço 6 e `smartSubsample`). O lote caiu de 241,11 MiB para 30,35 MiB (redução de 87,41%); a pasta com as cinco provisórias ocupa 30,90 MiB. A conversão não muda o estado `gerada` nem implica aprovação artística.
5. Para substituir/regerar manualmente: salvar `NNN.webp|png` em `public/assets/cards/art/`, rodar `npm run arte:manifesto` e `npm run arte:verificar`, e só então o dono aprova (`--autorizado-pelo-dono`). PNG e WebP do mesmo ID não podem coexistir.

## 9. Integração no jogo
- `CartaView` usa a ilustração se o ID está em `src/arte/indiceArte.json` (gerado do manifesto, estados provisoria/gerada/aprovada); senão mantém o SVG. Decisão em build, sem tentativa de carregar imagem inexistente; `onError` volta ao SVG. `<img>` com `object-fit: cover`, `image-rendering: pixelated`, `loading="lazy"`, `alt="Ilustração da carta NOME"`. Prop `arte` (undefined = manifesto, null = fallback) para testes/páginas.
- Não há painel de detalhe de carta no jogo hoje; nada a integrar além da mão/campo.
- Página de avaliação: `?arte=1` na URL (`/costa-clash/?arte=1`), sem link no produto, carregada em chunk separado (`src/Raiz.tsx`). Mostra legenda de molduras/selos, as 5 cartas piloto com a moldura nova (selo "PROVISÓRIA — recorte da referência, baixa resolução" ou "PENDENTE — sem arte gerada"), prompt da versão final 768x1024, botão copiar e critérios.

## 10. Provisórias (recortes) — como foram feitos
`001.png` (mangue), `018.png` (tartaruga), `047.png` (monstro de lixo), `031.png` (barco), `073.png` (estação): recortes em resolução nativa (267–269 x 193–225 px, proporção ~1,2–1,4:1) feitos com Chrome headless (CDP, sem upscale) da referência 2000x1327. **Desvio do pedido:** o selo circular da referência se sobrepõe ao canto superior esquerdo da janela de arte; para não carregar selo dentro da imagem, os recortes começam **abaixo do selo** (perdem o topo da cena) e ficam ~1,2:1 em vez de ~9:10. Coordenadas em `RECORTES_PROVISORIOS` (`src/arte/referencia.ts`). Não há upscale; o jogo renderiza com `image-rendering: pixelated`.
