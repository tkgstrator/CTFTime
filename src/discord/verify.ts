/**
 * Discord は Interactions Endpoint への POST に Ed25519 署名を付けてくる。
 * 検証に失敗したリクエストは 401 で返さないと、Discord 側の登録チェックが通らない。
 */

const hexToBytes = (hex: string): Uint8Array => {
  const pairs = hex.match(/.{2}/g)
  if (pairs === null) return new Uint8Array()
  return Uint8Array.from(pairs, (byte) => Number.parseInt(byte, 16))
}

export const verifyDiscordRequest = async (
  publicKey: string,
  signature: string | undefined,
  timestamp: string | undefined,
  body: string,
): Promise<boolean> => {
  if (signature === undefined || timestamp === undefined) return false
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      hexToBytes(publicKey),
      { name: 'Ed25519' },
      false,
      ['verify'],
    )
    return await crypto.subtle.verify(
      { name: 'Ed25519' },
      key,
      hexToBytes(signature),
      new TextEncoder().encode(timestamp + body),
    )
  } catch {
    // 鍵や署名が 16 進数として壊れている場合。検証失敗と同じ扱いにする。
    return false
  }
}
