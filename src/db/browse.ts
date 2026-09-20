/**
 * 公開サイト向けの読み取り専用 SQL。repository.ts はボット（同期・告知・参加表明）用で、
 * こちらは /api 配下からしか呼ばれない。
 *
 * buildEventQuery は D1 に触れない純粋関数にしてある。固定フラグメントの
 * ホワイトリストから WHERE 句を組み立て、値は必ずバインドする。sort と range は
 * enum なので、ユーザ入力が列名になることはない。
 */

import type { Dayjs } from 'dayjs'
import { z } from 'zod'
import {
  EMPTY_PRIZE_VALUES,
  type EventDetail,
  type EventQuery,
  type EventSummary,
  hasStatedPrize,
} from '@/shared/api'
import type { StoredEvent } from './model'
import { EventRowSchema } from './repository'

// --- クエリの組み立て（純粋関数） ---

export type EventQueryPlan = {
  where: string
  orderBy: string
  params: unknown[]
}

type Fragment = { clause: string; params: unknown[] }

/** `%` `_` はそのままだと LIKE のワイルドカードとして働くので、先にエスケープする。 */
const escapeLikePattern = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')

const rangeFragment = (range: EventQuery['range'], nowIso: string): Fragment | null => {
  if (range === 'upcoming') return { clause: 'start_at > ?', params: [nowIso] }
  if (range === 'running')
    return { clause: 'start_at <= ? AND finish_at > ?', params: [nowIso, nowIso] }
  if (range === 'past') return { clause: 'finish_at <= ?', params: [nowIso] }
  return null
}

/**
 * タイトルだけを見る。
 *
 * 説明文まで対象にすると「DIVER」が description の diversity に当たって 28 件返り、
 * 目的の DIVER OSINT CTF が埋もれた。全文検索には順位付けが要るが、
 * 名前で目当ての大会を引く用途にはタイトル一致で足りる。
 */
const searchFragment = (q: string): Fragment | null => {
  if (q.length === 0) return null
  return {
    clause: "title LIKE '%' || ? || '%' ESCAPE '\\'",
    params: [escapeLikePattern(q)],
  }
}

const equalsFragment = (column: 'format' | 'restrictions', value: string): Fragment | null => {
  if (value.length === 0) return null
  return { clause: `${column} = ?`, params: [value] }
}

const aiFragment = (ai: EventQuery['ai']): Fragment | null => {
  if (ai === 'any') return null
  return { clause: 'ai_policy = ?', params: [ai] }
}

const onsiteFragment = (onsite: EventQuery['onsite']): Fragment | null => {
  if (onsite === 'online') return { clause: 'onsite = ?', params: [0] }
  if (onsite === 'onsite') return { clause: 'onsite = ?', params: [1] }
  return null
}

/**
 * 賞金の有無。中身は自由記述なので「空でない」だけでは絞り込みにならない。
 * TBD のような未定を表すだけの値は記載なし側に寄せる（EMPTY_PRIZE_VALUES）。
 *
 * SQLite の LIKE と違い IN は大小文字を区別するので、UPPER で畳んでから比較する。
 */
const prizeFragment = (prize: EventQuery['prize']): Fragment | null => {
  if (prize === 'any') return null
  const placeholders = EMPTY_PRIZE_VALUES.map(() => '?').join(', ')
  const isEmpty = `(TRIM(prizes) = '' OR UPPER(TRIM(prizes)) IN (${placeholders}))`
  return {
    clause: prize === 'yes' ? `NOT ${isEmpty}` : isEmpty,
    params: [...EMPTY_PRIZE_VALUES],
  }
}

/** カレンダー表示範囲。[from, to] と重なるイベントを拾う（開始・終了の一方だけ範囲外でもよい）。 */
const fromFragment = (from: string): Fragment | null =>
  from.length === 0 ? null : { clause: 'finish_at >= ?', params: [from] }

const toFragment = (to: string): Fragment | null =>
  to.length === 0 ? null : { clause: 'start_at <= ?', params: [to] }

/** sort 値 → 列名のホワイトリスト。EVENT_SORTS に無い値は型で弾かれる。 */
const SORT_COLUMNS: Record<
  EventQuery['sort'],
  { column: 'start_at' | 'weight' | 'participants' | 'title'; direction: 'ASC' | 'DESC' }
> = {
  start: { column: 'start_at', direction: 'ASC' },
  '-start': { column: 'start_at', direction: 'DESC' },
  weight: { column: 'weight', direction: 'ASC' },
  '-weight': { column: 'weight', direction: 'DESC' },
  participants: { column: 'participants', direction: 'ASC' },
  '-participants': { column: 'participants', direction: 'DESC' },
  title: { column: 'title', direction: 'ASC' },
}

/**
 * 一覧・詳細・iCal 共通のクエリ組み立て。D1 に触らない純粋関数にしてあるので、
 * D1 を用意せずユニットテストできる（__tests__/browse-query.test.ts）。
 *
 * ORDER BY には必ず id ASC のタイブレークを付ける。ローカル 33 件中 18 件が
 * weight = 0 で、タイブレークが無いとページをまたいだときに順序が安定しない。
 */
export const buildEventQuery = (query: EventQuery, now: Dayjs): EventQueryPlan => {
  const nowIso = now.toISOString()
  const fragments = [
    rangeFragment(query.range, nowIso),
    searchFragment(query.q),
    equalsFragment('format', query.format),
    equalsFragment('restrictions', query.restrictions),
    aiFragment(query.ai),
    onsiteFragment(query.onsite),
    prizeFragment(query.prize),
    fromFragment(query.from),
    toFragment(query.to),
  ].filter((fragment): fragment is Fragment => fragment !== null)

  const where =
    fragments.length > 0 ? fragments.map((fragment) => fragment.clause).join(' AND ') : '1 = 1'
  const params = fragments.flatMap((fragment) => fragment.params)
  const { column, direction } = SORT_COLUMNS[query.sort]

  return { where, orderBy: `${column} ${direction}, id ASC`, params }
}

// --- 行のパース（寛容版） ---

/**
 * repository.ts の toEvents は 1 行でも壊れていれば例外にする（ボットは大きく失敗すべき）。
 * こちらは公開サイト用で、1 件の不正行のせいで一覧全体を 500 にしたくないので、
 * 行ごとに safeParse し、失敗した行は console.error で記録して読み飛ばす。
 */
export const toEventsLenient = (results: unknown): StoredEvent[] => {
  const rows = z.array(z.unknown()).safeParse(results)
  if (!rows.success) return []
  return rows.data.flatMap((row) => {
    const parsed = EventRowSchema.safeParse(row)
    if (!parsed.success) {
      console.error(
        'events 行のパースに失敗したため読み飛ばします',
        parsed.error.issues[0]?.message,
      )
      return []
    }
    return [parsed.data]
  })
}

// --- レスポンス整形 ---

/** 一覧に載せる説明文の長さ。詳細は description をそのまま返す。 */
const SUMMARY_LENGTH = 200

const summarizeDescription = (description: string): string =>
  description.length > SUMMARY_LENGTH ? `${description.slice(0, SUMMARY_LENGTH)}…` : description

/**
 * ctftimeParticipants は CTFTime 全体の登録チーム数。Discord の参加表明数とは別物なので、
 * 素の participants とは呼ばない。
 * announced は announce_message_id の有無で判定する
 * （notifications.kind = 'new' は初期同期のシード記録を含むため使えない）。
 * announce_message_id 自体は guild id を保存していないので使い道が無く、そのまま返さない。
 */
export const toEventSummary = (event: StoredEvent): EventSummary => ({
  id: event.id,
  title: event.title,
  url: event.url,
  ctftimeUrl: event.ctftimeUrl,
  logo: event.logo,
  format: event.format,
  restrictions: event.restrictions,
  onsite: event.onsite,
  location: event.location,
  weight: event.weight,
  ctftimeParticipants: event.participants,
  startAt: event.startAt,
  finishAt: event.finishAt,
  durationDays: event.durationDays,
  durationHours: event.durationHours,
  summary: summarizeDescription(event.description),
  aiPolicy: event.aiPolicy,
  aiSnippets: event.aiSnippets,
  hasPrize: hasStatedPrize(event.prizes),
  announced: event.announceMessageId !== null,
})

export const toEventDetail = (event: StoredEvent): EventDetail => ({
  ...toEventSummary(event),
  description: event.description,
  prizes: event.prizes,
  organizers: event.organizers,
})

// --- D1 アクセス ---

export type EventListResult = { items: StoredEvent[]; total: number }

const CountRowSchema = z.object({ count: z.number().int() })

const parseCount = (results: unknown): number => {
  const rows = z.array(CountRowSchema).safeParse(results)
  if (!rows.success) return 0
  const row = rows.data[0]
  return row === undefined ? 0 : row.count
}

/** 一覧。総件数とページぶんの行を db.batch でまとめて取る。 */
export const listEvents = async (
  db: D1Database,
  query: EventQuery,
  now: Dayjs,
): Promise<EventListResult> => {
  const plan = buildEventQuery(query, now)
  const offset = (query.page - 1) * query.perPage
  const countStmt = db
    .prepare(`SELECT COUNT(*) AS count FROM events WHERE ${plan.where}`)
    .bind(...plan.params)
  const listStmt = db
    .prepare(`SELECT * FROM events WHERE ${plan.where} ORDER BY ${plan.orderBy} LIMIT ? OFFSET ?`)
    .bind(...plan.params, query.perPage, offset)

  const [countResult, listResult] = await db.batch([countStmt, listStmt])
  return {
    total: parseCount(countResult === undefined ? [] : countResult.results),
    items: toEventsLenient(listResult === undefined ? [] : listResult.results),
  }
}

/** カレンダー購読（iCal）用。ページングはせず、暴走防止の上限だけ掛けて返す。 */
const FEED_LIMIT = 1000

export const listEventsForFeed = async (
  db: D1Database,
  query: EventQuery,
  now: Dayjs,
): Promise<StoredEvent[]> => {
  const plan = buildEventQuery(query, now)
  const { results } = await db
    .prepare(`SELECT * FROM events WHERE ${plan.where} ORDER BY ${plan.orderBy} LIMIT ?`)
    .bind(...plan.params, FEED_LIMIT)
    .all()
  return toEventsLenient(results)
}

const NotificationRowSchema = z.object({
  kind: z.enum(['new', 'reminder_24h', 'reminder_1h', 'start', 'end']),
  sent_at: z.string().nonempty(),
})

export type NotificationRow = {
  kind: z.infer<typeof NotificationRowSchema>['kind']
  sentAt: string
}

/** イベントの通知履歴。詳細ページ用。 */
export const listNotifications = async (
  db: D1Database,
  eventId: number,
): Promise<NotificationRow[]> => {
  const { results } = await db
    .prepare('SELECT kind, sent_at FROM notifications WHERE event_id = ? ORDER BY sent_at ASC')
    .bind(eventId)
    .all()
  const rows = z.array(NotificationRowSchema).safeParse(results)
  if (!rows.success) return []
  return rows.data.map((row) => ({ kind: row.kind, sentAt: row.sent_at }))
}

const TotalsRowSchema = z.object({
  total: z.number().int(),
  running: z.number().int(),
  upcoming: z.number().int(),
  past: z.number().int(),
  announced: z.number().int(),
  participants: z.number().int(),
  last_synced_at: z.string().nonempty().nullable(),
})

const FacetRowSchema = z.object({ value: z.string().nonempty() })

const parseFacetValues = (results: unknown): string[] => {
  const rows = z.array(FacetRowSchema).safeParse(results)
  if (!rows.success) return []
  return rows.data.map((row) => row.value)
}

export type SummaryData = {
  totals: {
    events: number
    running: number
    upcoming: number
    past: number
    /** サイト全体での Discord 参加表明の総数（participants テーブルの行数）。 */
    participants: number
    announced: number
  }
  lastSyncedAt: string | null
  facets: { formats: string[]; restrictions: string[] }
  next: StoredEvent | null
}

/**
 * サマリ画面用のまとめ取得。4 クエリを db.batch で一度に投げる。
 * SUM(...) は対象行が 0 件だと NULL を返すので COALESCE で 0 に倒す
 * （events テーブルが空のときに totals が NULL になって落ちるのを防ぐ）。
 */
export const getSummary = async (db: D1Database, now: Dayjs): Promise<SummaryData> => {
  const nowIso = now.toISOString()
  const totalsStmt = db
    .prepare(`
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN start_at <= ? AND finish_at > ? THEN 1 ELSE 0 END), 0) AS running,
        COALESCE(SUM(CASE WHEN start_at > ? THEN 1 ELSE 0 END), 0) AS upcoming,
        COALESCE(SUM(CASE WHEN finish_at <= ? THEN 1 ELSE 0 END), 0) AS past,
        COALESCE(SUM(CASE WHEN announce_message_id IS NOT NULL THEN 1 ELSE 0 END), 0) AS announced,
        (SELECT COUNT(*) FROM participants) AS participants,
        MAX(updated_at) AS last_synced_at
      FROM events
    `)
    .bind(nowIso, nowIso, nowIso, nowIso)
  const formatsStmt = db.prepare(
    "SELECT DISTINCT format AS value FROM events WHERE format <> '' ORDER BY format ASC",
  )
  const restrictionsStmt = db.prepare(
    "SELECT DISTINCT restrictions AS value FROM events WHERE restrictions <> '' ORDER BY restrictions ASC",
  )
  const nextStmt = db
    .prepare('SELECT * FROM events WHERE start_at > ? ORDER BY start_at ASC LIMIT 1')
    .bind(nowIso)

  const [totalsResult, formatsResult, restrictionsResult, nextResult] = await db.batch([
    totalsStmt,
    formatsStmt,
    restrictionsStmt,
    nextStmt,
  ])

  const totalsRows = z
    .array(TotalsRowSchema)
    .safeParse(totalsResult === undefined ? [] : totalsResult.results)
  const totals = totalsRows.success ? totalsRows.data[0] : undefined

  const next = toEventsLenient(nextResult === undefined ? [] : nextResult.results)[0]

  return {
    totals: {
      events: totals === undefined ? 0 : totals.total,
      running: totals === undefined ? 0 : totals.running,
      upcoming: totals === undefined ? 0 : totals.upcoming,
      past: totals === undefined ? 0 : totals.past,
      participants: totals === undefined ? 0 : totals.participants,
      announced: totals === undefined ? 0 : totals.announced,
    },
    lastSyncedAt: totals === undefined ? null : totals.last_synced_at,
    facets: {
      formats: parseFacetValues(formatsResult === undefined ? [] : formatsResult.results),
      restrictions: parseFacetValues(
        restrictionsResult === undefined ? [] : restrictionsResult.results,
      ),
    },
    next: next === undefined ? null : next,
  }
}
