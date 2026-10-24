/// <reference types="node" />
// Auxiliares de teste: cria PNG/WebP mínimos e válidos (ou propositalmente inválidos) em memória.
import { crc32, deflateSync } from 'node:zlib'

function chunk(tipo: string, dados: Buffer): Buffer {
  const comp = Buffer.alloc(4)
  comp.writeUInt32BE(dados.length)
  const corpo = Buffer.concat([Buffer.from(tipo, 'latin1'), dados])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(corpo))
  return Buffer.concat([comp, corpo, crc])
}

/** PNG em tons de cinza 8 bits, preenchido com `valor` (varie `valor` para gerar arquivos diferentes). */
export function criarPng(largura: number, altura: number, valor = 0): Buffer {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(largura, 0)
  ihdr.writeUInt32BE(altura, 4)
  ihdr[8] = 8
  ihdr[9] = 0
  const linha = Buffer.alloc(1 + largura, valor)
  linha[0] = 0
  const bruto = Buffer.concat(Array.from({ length: altura }, () => linha))
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(bruto)), chunk('IEND', Buffer.alloc(0))])
}

/** WebP sem perda (VP8L) só com cabeçalho válido e carga qualquer: o suficiente para ler dimensões. */
export function criarWebp(largura: number, altura: number, preenchimento = 0): Buffer {
  const carga = Buffer.alloc(200, preenchimento)
  carga[0] = 0x2f
  const bits = ((largura - 1) & 0x3fff) | (((altura - 1) & 0x3fff) << 14)
  carga.writeUInt32LE(bits >>> 0, 1)
  const vp8l = Buffer.concat([Buffer.from('VP8L', 'latin1'), Buffer.from([carga.length, 0, 0, 0]), carga])
  const riff = Buffer.alloc(4)
  riff.writeUInt32LE(4 + vp8l.length)
  return Buffer.concat([Buffer.from('RIFF', 'latin1'), riff, Buffer.from('WEBP', 'latin1'), vp8l])
}
