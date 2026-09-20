import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { type CtftimeEvent, CtftimeEventListSchema } from './schema'

const API_ENDPOINT = 'https://ctftime.org/api/v1/events/'

/** CTFTime は User-Agent を送らないリクエストに 403 を返すことがある。 */
const USER_AGENT = 'ctftime-bot (Cloudflare Workers)'

/**
 * 1 リクエストで取得する件数。
 * ドキュメントは 100 を上限と読めるが、実際には 500 を渡すとそれ以上返ってくる。
 * 過去 1 年の一括取り込みが 1 回のリクエストで収まる値にしてある
 * （2026-09 時点で過去 365 日は 369 件）。
 */
const FETCH_LIMIT = 500

/**
 * start / finish の範囲に「開始時刻」が入るイベントを取得する。
 * 開催中のまま範囲外へ出た大会は拾えない（CTFTime 側の解釈がそうなっている）。
 */
export const fetchEventsBetween = async (from: Dayjs, to: Dayjs): Promise<CtftimeEvent[]> => {
  const endpoint = new URL(API_ENDPOINT)
  endpoint.searchParams.set('limit', FETCH_LIMIT.toString())
  endpoint.searchParams.set('start', from.unix().toString())
  endpoint.searchParams.set('finish', to.unix().toString())

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

/** 今から lookaheadDays 日後までに開始するイベント。 */
export const fetchUpcomingEvents = async (lookaheadDays: number): Promise<CtftimeEvent[]> => {
  const now = dayjs()
  return fetchEventsBetween(now, now.add(lookaheadDays, 'day'))
}
