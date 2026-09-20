import { describe, expect, test } from 'bun:test'
import { verifyDiscordRequest } from '../src/discord/verify'

const toHex = (buffer: ArrayBuffer | JsonWebKey): string => {
  if (!(buffer instanceof ArrayBuffer)) {
    throw new Error('raw 形式で鍵を取り出せませんでした')
  }
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

const generated = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])
if (!('publicKey' in generated)) {
  throw new Error('Ed25519 の鍵ペアを生成できませんでした')
}
const keyPair = generated
const publicKey = toHex(await crypto.subtle.exportKey('raw', keyPair.publicKey))

const sign = async (payload: string): Promise<string> =>
  toHex(
    await crypto.subtle.sign(
      { name: 'Ed25519' },
      keyPair.privateKey,
      new TextEncoder().encode(payload),
    ),
  )

describe('verifyDiscordRequest', () => {
  const timestamp = '1758326400'
  const body = '{"type":1}'

  test('正しい署名を受け入れる', async () => {
    const signature = await sign(timestamp + body)
    expect(await verifyDiscordRequest(publicKey, signature, timestamp, body)).toBe(true)
  })

  test('本文が改竄されていたら拒否する', async () => {
    const signature = await sign(timestamp + body)
    expect(await verifyDiscordRequest(publicKey, signature, timestamp, '{"type":2}')).toBe(false)
  })

  test('timestamp が違えば拒否する', async () => {
    const signature = await sign(timestamp + body)
    expect(await verifyDiscordRequest(publicKey, signature, '1758326401', body)).toBe(false)
  })

  test('ヘッダが無ければ拒否する', async () => {
    expect(await verifyDiscordRequest(publicKey, undefined, undefined, body)).toBe(false)
  })

  test('16 進数として壊れた署名でも例外を投げない', async () => {
    expect(await verifyDiscordRequest(publicKey, 'not-hex', timestamp, body)).toBe(false)
  })
})
