# Arte das cartas — guia de estilo, geração e integração

> **Catálogo atual em 08/11/2026.** O jogo mantém exclusivamente as 70 ilustrações `CC-101…CC-170`, geradas com o ImageGen integrado ao Codex. Todas estão no estado **gerada** e aguardam aprovação do dono.

## 1. Estilo obrigatório (referência principal: `Estilos-de-cartas.webp`)
Pixel art retrô estilo PlayStation 1 / 16-bit moderno, aparência de carta colecionável:
- **Cena completa** preenchendo todo o quadro (não ícones soltos), com **elemento principal grande e centralizado**, primeiro plano, plano médio e fundo.
- Contornos escuros finos e definidos; cores vibrantes e saturadas, harmonizadas (contraste de laranja quente com azul-turquesa); sombras profundas; pixels visíveis com dithering sutil; alta densidade de detalhes.
- Iluminação dramática: raios de luz subaquáticos, pôr do sol dourado/laranja/roxo, céu azul com nuvens brancas em pixels (dia), tempestade roxa (impactos). A noite azul-lunar das telas do jogo continua válida para cenas específicas.

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
| protegida | cinza `#8e9aa6` | concha / engrenagem | restinga, áreas protegidas, saneamento |
| planejamento | dourado `#e0a82e` | estrela | planejamento, pesquisa, ações |
| ondas | azul-ondas `#2ab4e8` | onda | comunidades tradicionais, ressaca, mobilização |

O catálogo atual contém apenas unidades de fauna, classificadas por padrão como vida marinha (borda azul e selo de gota). A atribuição visual é só apresentação e não altera regras.

## 2. Requisitos técnicos da imagem
- **Vertical 3:4, preferencial 768x1024**; mínimo 384x512; PNG ou WebP; ideal < 1,5 MB (erro acima de 5 MB).
- Sem texto, nome, ATK/DEF, moldura, selo nem logotipo.
- Nome estável pelo número do ID: `CC-101` -> `101.webp`, em `public/assets/cards/art/`.
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

Textos completos e hex em `PALETAS` (`src/arte/prompts.ts`).

## 4. Conteúdo ambientalmente defensável
- Conceitos reconhecíveis (manguezal com raízes escora, restinga com flores, tanques de tratamento etc.).
- Impactos viram criaturas/fenômenos sombrios que **representam o fenômeno**, sem apologia e **sem demonizar pessoas** (ex.: ocupação irregular = estrutura precária em área frágil, sem moradores).
- Soluções e ações **nunca sugerem que eliminam totalmente um risco** (teste automático nos sujeitos).
- Comunidades tradicionais (pescador artesanal, caiçara): retrato digno e respeitoso, sem estereótipos ou caricatura; embarcações e ferramentas reais.

## 5. Arquivos
- `src/arte/sujeitos.ts`: mapa de exceções editoriais, atualmente vazio; os 70 sujeitos são derivados de classificação, ambiente e característica do catálogo.
- `src/arte/prompts.ts`: gerador determinístico (prefixo + assunto + paleta e luz + composição + negativos; termina com "Sem texto, sem moldura, sem ATK/DEF, sem logotipo."). Também em inglês.
- `src/arte/{categorias,manifesto,arteDisponivel,piloto,referencia}.ts`, `src/arte/indiceArte.json` (índice do build).
- `scripts/arte/*.mjs` e `scripts/{arte-manifesto,arte-verificar,arte-prompts,gerar-arte}.mjs` (Node 22.18+/24; carregam os `.ts` por remoção de tipos).
- `public/assets/cards/art/manifest.json`: 70 entradas (id, nome, arquivo, estado, prompt, promptHash, promptHashGerado, origem, observacao, verificacao{largura, altura, bytes, sha256}).
- `docs/arte/lote-piloto.md` + `prompts-piloto.json` (4 pilotos) e `prompts-catalogo.{md,json}` (70).

## 6. Estados e regras do manifesto
`pendente | provisoria | gerada | aprovada | rejeitada`.
- **provisoria**: recorte/rascunho só para avaliar estilo, nunca final; não há provisórias no catálogo atual.
- **gerada**: arquivo existe, aguarda aprovação. Hoje: 70 cartas. **aprovada**: só o dono; **nunca é substituída**. Aprovar: `npm run arte:manifesto -- --marcar CC-101 --estado aprovada --autorizado-pelo-dono`.
- Colocou arquivo novo manualmente? `arte:manifesto` marca `gerada` e registra sha256/dimensões.

## 7. Comandos
- `npm run arte:manifesto` sincroniza manifesto e índice (preserva estados/hashes); `-- --check` só confere; `-- --marcar CC-101 --estado aprovada --autorizado-pelo-dono` aprova uma arte.
- `npm run arte:verificar`: PNG/WebP válidos, 3:4, dimensão, tamanho, duplicados por sha256, nomes x IDs, ausentes. Hoje: 70 geradas, todas WebP 768x1024.
- `npm run arte:prompts`: reexporta os prompts em `docs/arte/`.
- `npm run arte:gerar -- --lote piloto | --ids CC-101,CC-153 | --proximos 10 [--executar] [--forcar]`: **dry-run por padrão**; com `--executar`, gera somente itens pendentes e nunca substitui uma arte aprovada.

## 8. Geração realizada e próximos passos
1. Em 08/11/2026, o Codex gerou uma imagem separada para cada uma das 70 cartas importadas. Cada prompt combinou nome, classificação, ambiente e característica informados com o DNA visual existente, proibindo texto, moldura, ATK/DEF e logotipo.
2. O dono ainda precisa revisar e marcar cada candidata como `aprovada` ou `rejeitada`; nenhuma foi aprovada automaticamente. A inspeção do Codex foi amostral, não uma revisão artística completa.
3. As 72 artes antigas foram removidas junto com as cartas `CC-001…CC-072`.
4. As 70 artes atuais são WebP 768x1024. O estado `gerada` não implica aprovação artística.
5. Para substituir/regerar manualmente: salvar `NNN.webp|png` em `public/assets/cards/art/`, rodar `npm run arte:manifesto` e `npm run arte:verificar`, e só então o dono aprova (`--autorizado-pelo-dono`).

## 9. Integração no jogo
- `CartaView` usa a ilustração se o ID está em `src/arte/indiceArte.json` (gerado do manifesto, estados provisoria/gerada/aprovada); senão mantém o SVG. Decisão em build, sem tentativa de carregar imagem inexistente; `onError` volta ao SVG. `<img>` com `object-fit: cover`, `image-rendering: pixelated`, `loading="lazy"`, `alt="Ilustração da carta NOME"`. Prop `arte` (undefined = manifesto, null = fallback) para testes/páginas.
- O botão de informação abre classificação, ambiente e característica em mão/campo conhecidos, coleção e drops.
- Página de avaliação: `?arte=1` na URL (`/costa-clash/?arte=1`), sem link no produto, carregada em chunk separado (`src/Raiz.tsx`). Mostra quatro cartas atuais, prompt, botão copiar e critérios.
