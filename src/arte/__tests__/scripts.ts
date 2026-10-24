// Reexporta os módulos .mjs de scripts/arte (sem declarações de tipo) como `any` para os testes.
/* eslint-disable */
// @ts-ignore
import * as gerar from '../../../scripts/arte/gerar.mjs'
// @ts-ignore
import * as manifesto from '../../../scripts/arte/manifesto.mjs'
// @ts-ignore
import * as provedores from '../../../scripts/arte/provedores.mjs'
// @ts-ignore
import * as verificar from '../../../scripts/arte/verificar.mjs'
// @ts-ignore
import * as imagem from '../../../scripts/arte/imagem.mjs'

export const { executarGeracao, lerArgumentos, planejar }: any = gerar
export const { CAMINHOS, lerManifesto, serializar, sha256, sincronizarPasta }: any = manifesto
export const { obterProvedor, PROVEDORES }: any = provedores
export const { formatarRelatorio, verificarArte }: any = verificar
export const { lerInfoImagem }: any = imagem
