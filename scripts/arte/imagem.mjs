// Leitura mínima de PNG e WebP (assinatura, dimensões, integridade básica). Sem dependências.
import { crc32 } from 'node:zlib'

const ASSINATURA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/**
 * Analisa os bytes de uma imagem.
 * @param {Uint8Array} bytes
 * @returns {{ ok: true, formato: 'png' | 'webp', largura: number, altura: number } | { ok: false, erro: string }}
 */
export function lerInfoImagem(bytes) {
  const b = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (b.length < 12) return { ok: false, erro: 'arquivo pequeno demais para ser uma imagem' }
  if (b.subarray(0, 8).equals(ASSINATURA_PNG)) return lerPng(b)
  if (b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return lerWebp(b)
  return { ok: false, erro: 'assinatura desconhecida (não é PNG nem WebP)' }
}

function lerPng(b) {
  if (b.length < 33 || b.toString('latin1', 12, 16) !== 'IHDR') return { ok: false, erro: 'PNG sem cabeçalho IHDR' }
  const tamanho = b.readUInt32BE(8)
  if (tamanho !== 13) return { ok: false, erro: 'PNG com IHDR inválido' }
  if (crc32(b.subarray(12, 12 + 4 + 13)) !== b.readUInt32BE(29)) return { ok: false, erro: 'PNG com CRC do IHDR inválido (arquivo corrompido)' }
  const largura = b.readUInt32BE(16)
  const altura = b.readUInt32BE(20)
  if (!largura || !altura) return { ok: false, erro: 'PNG com dimensão zero' }
  // O último chunk deve ser IEND (12 bytes: 0000 0000 'IEND' crc).
  const fim = b.subarray(b.length - 12)
  if (fim.toString('latin1', 4, 8) !== 'IEND') return { ok: false, erro: 'PNG truncado (sem IEND)' }
  return { ok: true, formato: 'png', largura, altura }
}

function lerWebp(b) {
  if (b.length < 30) return { ok: false, erro: 'WebP truncado' }
  const tamanhoRiff = b.readUInt32LE(4) + 8
  if (tamanhoRiff > b.length) return { ok: false, erro: 'WebP truncado (tamanho RIFF maior que o arquivo)' }
  const tipo = b.toString('latin1', 12, 16)
  let largura
  let altura
  if (tipo === 'VP8 ') {
    // Quadro de chave: bytes 23-25 = 9d 01 2a; largura/altura em 14 bits.
    if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return { ok: false, erro: 'WebP VP8 sem assinatura de quadro de chave' }
    largura = b.readUInt16LE(26) & 0x3fff
    altura = b.readUInt16LE(28) & 0x3fff
  } else if (tipo === 'VP8L') {
    if (b[20] !== 0x2f) return { ok: false, erro: 'WebP VP8L sem assinatura' }
    const bits = b.readUInt32LE(21)
    largura = (bits & 0x3fff) + 1
    altura = ((bits >>> 14) & 0x3fff) + 1
  } else if (tipo === 'VP8X') {
    largura = (b[24] | (b[25] << 8) | (b[26] << 16)) + 1
    altura = (b[27] | (b[28] << 8) | (b[29] << 16)) + 1
  } else {
    return { ok: false, erro: `WebP com chunk desconhecido (${tipo.trim()})` }
  }
  if (!largura || !altura) return { ok: false, erro: 'WebP com dimensão zero' }
  return { ok: true, formato: 'webp', largura, altura }
}
