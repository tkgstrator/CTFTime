import dayjs from 'dayjs'
import { type CtftimeEvent, CtftimeEventListSchema } from './schema'

const API_ENDPOINT = 'https://ctftime.org/api/v1/events/'

/** CTFTime は User-Agent を送らないリクエストに 403 を返すことがある。 */
const USER_AGENT = 'ctftime-bot (Cloudflare Workers)'

/** 1 リクエストで取得する件数。CTFTime 側の上限は 100。 */
const FETCH_LIMIT = 100

/**
 * 今から lookaheadDays 日後までに開始するイベントを取得する。
 * start / finish は CTFTime 側では「開始時刻の範囲」として解釈される。
 */
export const fetchUpcomingEvents = async (lookaheadDays: number): Promise<CtftimeEvent[]> => {
  const now = dayjs()
  const endpoint = new URL(API_ENDPOINT)
  endpoint.searchParams.set('limit', FETCH_LIMIT.toString())
  endpoint.searchParams.set('start', now.unix().toString())
  endpoint.searchParams.set('finish', now.add(lookaheadDays, 'day').unix().toString())

  const response = await fetch(endpoint, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  })
  if (!response.ok) {
    throw new Error(`CTFTime API が ${response.status} ${response.statusText} を返しました`)
  }

  const result = CtftimeEventListSchema.safeParse(await response.json())
  if (!result.success) {
    const detail = result.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(' / ')
    throw new Error(`CTFTime API のレスポンス形式が想定と異なります — ${detail}`)
  }
  return result.data
}
