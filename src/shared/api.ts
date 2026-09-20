/**
 * Worker と Web UI の間の契約。zod スキーマが正で、型は z.infer で導出する。
 *
 * ここは両方の tsconfig から読まれる。src/web/tsconfig.json は types を
 * ["vite/client"] に差し替えていて Workers 型が無いので、D1Database のような
 * Workers 固有の型を参照してはいけない。import してよいのは zod と、
 * 依存を持たない ai-policy だけ。
 */

import { z } from 'zod'
import { AI_POLICY_VALUES } from '@/ctftime/ai-policy'

export const API_PATHS = {
  health: '/api/health',
  summary: '/api/summary',
  events: '/api/events',
  eventsIcs: '/api/events.ics',
  event: (id: number) => `/api/events/${id}`,
} as const

/** 保存時に正規化済みなので、読む側は空文字を許す。 */
const text = z.string().trim()
const timestamp = z.iso.datetime()

// --- クエリ ---

export const EVENT_RANGES = ['upcoming', 'running', 'past', 'all'] as const
export const EVENT_SORTS = [
  'start',
  '-start',
  'weight',
  '-weight',
  'participants',
  '-participants',
  'title',
] as const
export const ONSITE_FILTERS = ['any', 'online', 'onsite'] as const
export const PRIZE_FILTERS = ['any', 'yes', 'no'] as const

/**
 * 賞金の記載が実質的に空とみなす値。CTFTime の prizes は自由記述で、
 * 「TBD」だけ書いて未定を表すイベントが実データの 3 割ほどある（TDB という
 * タイポも実在する）。これらを「賞金あり」に数えると絞り込みの役に立たないので、
 * 記載なしと同じ側に寄せる。SQLite の比較用に大文字で持つ。
 */
export const EMPTY_PRIZE_VALUES = ['TBD', 'TDB', 'TBA', 'N/A', 'NA', 'NONE', '-', '--'] as const
export const AI_FILTERS = ['any', ...AI_POLICY_VALUES] as const

export const MAX_PER_PAGE = 50

/**
 * 一覧のクエリ。Worker のクエリ解析・ルートの validateSearch・fetch のシリアライザの
 * 3 箇所で使うので、URL と API が同じ定義を共有する。
 *
 * 全フィールドに .catch() を付けてあるのは、URL を手で編集されても
 * 画面を落とさず既定値に落とすため。
 */
export const EventQuerySchema = z.object({
  range: z.enum(EVENT_RANGES).catch('upcoming'),
  q: text.max(100).default('').catch(''),
  format: text.max(100).default('').catch(''),
  restrictions: text.max(100).default('').catch(''),
  ai: z.enum(AI_FILTERS).catch('any'),
  onsite: z.enum(ONSITE_FILTERS).catch('any'),
  prize: z.enum(PRIZE_FILTERS).catch('any'),
  sort: z.enum(EVENT_SORTS).catch('start'),
  page: z.coerce.number().int().min(1).catch(1),
  perPage: z.coerce.number().int().min(1).max(MAX_PER_PAGE).catch(20),
  /** カレンダーの表示範囲。ISO8601 の文字列で渡す（辞書順 = 時系列順）。 */
  from: timestamp.or(z.literal('')).default('').catch(''),
  to: timestamp.or(z.literal('')).default('').catch(''),
})

export type EventQuery = z.infer<typeof EventQuerySchema>

/** URL に既定値を載せないための基準。ルート側の stripSearchParams に渡す。 */
export const EVENT_QUERY_DEFAULTS: EventQuery = {
  range: 'upcoming',
  q: '',
  format: '',
  restrictions: '',
  ai: 'any',
  onsite: 'any',
  prize: 'any',
  sort: 'start',
  page: 1,
  perPage: 20,
  from: '',
  to: '',
}

// --- レスポンス ---

/**
 * 一覧行。詳細との差は description（一覧は summary に切り詰める）と organizers だけ。
 *
 * 参加者数が 2 種類あることに注意。ctftimeParticipants は CTFTime 全体の登録チーム数、
 * discordParticipants はこの Discord サーバーでの参加表明数で、まったく別の数字。
 * どちらも participants と呼ぶと必ず誤読されるので、名前で区別する。
 */
export const EventSummarySchema = z.object({
  id: z.number().int(),
  title: text,
  url: text,
  ctftimeUrl: text,
  logo: text,
  format: text,
  restrictions: text,
  onsite: z.boolean(),
  location: text,
  weight: z.number(),
  ctftimeParticipants: z.number().int(),
  discordParticipants: z.number().int(),
  startAt: timestamp,
  finishAt: timestamp,
  durationDays: z.number().int(),
  durationHours: z.number().int(),
  summary: text,
  aiPolicy: z.enum(AI_POLICY_VALUES),
  aiSnippets: z.array(text).default([]),
  /** Discord に告知済みか。announce_message_id の有無で判定する。 */
  announced: z.boolean(),
})

export type EventSummary = z.infer<typeof EventSummarySchema>

export const EventDetailSchema = EventSummarySchema.extend({
  description: text,
  /**
   * 賞品・賞金の記載。完全な自由記述で、金額のことも現物のことも、
   * 「TBD」だけのことも空のこともある。構造化せず原文のまま渡す。
   */
  prizes: text,
  organizers: z.array(text).default([]),
})

export type EventDetail = z.infer<typeof EventDetailSchema>

/**
 * 参加表明した人。display_name と avatar_hash は migration 0002 以前の行だと
 * 空文字のまま残る（その人が次にボタンを押した時点で埋まる）。
 * 表示側は空のときに userId へフォールバックすること。
 */
export const ParticipantSchema = z.object({
  userId: text,
  displayName: text,
  avatarHash: text,
})

export type Participant = z.infer<typeof ParticipantSchema>

export const NOTIFICATION_KINDS = ['new', 'reminder_24h', 'reminder_1h', 'start', 'end'] as const

export const NotificationSchema = z.object({
  kind: z.enum(NOTIFICATION_KINDS),
  sentAt: timestamp,
})

export type Notification = z.infer<typeof NotificationSchema>

export const EventListResponseSchema = z.object({
  items: z.array(EventSummarySchema),
  total: z.number().int(),
  page: z.number().int(),
  perPage: z.number().int(),
  hasMore: z.boolean(),
})

export type EventListResponse = z.infer<typeof EventListResponseSchema>

export const EventDetailResponseSchema = z.object({
  event: EventDetailSchema,
  participants: z.array(ParticipantSchema),
  notifications: z.array(NotificationSchema),
})

export type EventDetailResponse = z.infer<typeof EventDetailResponseSchema>

export const SummaryResponseSchema = z.object({
  totals: z.object({
    events: z.number().int(),
    running: z.number().int(),
    upcoming: z.number().int(),
    past: z.number().int(),
    participants: z.number().int(),
    announced: z.number().int(),
  }),
  /** events が空なら null。MAX(updated_at) がそのまま NULL になる。 */
  lastSyncedAt: timestamp.nullable(),
  /** 実際に存在する値だけを返す。絞り込みの選択肢に空振りを出さないため。 */
  facets: z.object({
    formats: z.array(text),
    restrictions: z.array(text),
  }),
  next: EventSummarySchema.nullable(),
})

export type SummaryResponse = z.infer<typeof SummaryResponseSchema>

export const HealthResponseSchema = z.object({ ok: z.boolean() })

export const API_ERROR_CODES = ['bad_request', 'not_found', 'internal'] as const

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.enum(API_ERROR_CODES),
    message: text,
  }),
})

export type ApiErrorBody = z.infer<typeof ApiErrorSchema>
