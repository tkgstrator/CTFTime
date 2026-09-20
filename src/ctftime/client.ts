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
  // 上限ちょうどで返ってきたということは、その先が切り捨てられている可能性が高い。
  // 黙って取りこぼすのが一番困るので、気付けるように残す。
  if (result.data.length >= FETCH_LIMIT) {
    console.warn(
      `CTFTime から上限の ${FETCH_LIMIT} 件が返りました。範囲内のイベントを取りこぼしている可能性があります`,
    )
  }
  return result.data
}

/**
 * 通常同期で見る範囲。過去側にも少し広げてあるのは取りこぼしを拾い直すため。
 *
 * 一括取り込みは一度しか走らないので、それだけに頼るとボットが止まっている間に
 * 開始して終わった大会が永久に入らない。毎回この幅を見ておけば、
 * 停止が この日数以内 なら次の同期で自動的に埋まる。
 */
const RESYNC_PAST_DAYS = 30

/** 過去 RESYNC_PAST_DAYS 日から lookaheadDays 日後までに開始するイベント。 */
export const fetchSyncWindow = async (lookaheadDays: number): Promise<CtftimeEvent[]> => {
  const now = dayjs()
  return fetchEventsBetween(now.subtract(RESYNC_PAST_DAYS, 'day'), now.add(lookaheadDays, 'day'))
}
