import { z } from 'zod'

const API_BASE = 'https://discord.com/api/v10'

const MessageSchema = z.object({ id: z.string().nonempty() })

const authHeaders = (token: string): HeadersInit => ({
  Authorization: `Bot ${token}`,
  'Content-Type': 'application/json',
})

/** チャンネルにメッセージを投稿し、その id を返す。 */
export const postMessage = async (
  token: string,
  channelId: string,
  payload: unknown,
): Promise<string> => {
  const response = await fetch(`${API_BASE}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(
      `Discord へのメッセージ投稿に失敗しました (${response.status}): ${await response.text()}`,
    )
  }
  const parsed = MessageSchema.safeParse(await response.json())
  if (!parsed.success) {
    throw new Error('Discord のレスポンスにメッセージ id が含まれていません')
  }
  return parsed.data.id
}

/**
 * 既存メッセージを編集する。告知メッセージのボタンや参加者一覧を
 * 後から更新するのに使う。消えている場合もあるので失敗は握り潰す。
 */
export const editMessage = async (
  token: string,
  channelId: string,
  messageId: string,
  payload: unknown,
): Promise<boolean> => {
  const response = await fetch(`${API_BASE}/channels/${channelId}/messages/${messageId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })
  return response.ok
}
