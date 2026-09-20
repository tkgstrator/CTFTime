/**
 * Worker の /api と話す唯一の窓口。
 *
 * レスポンスは必ず shared のスキーマで safeParse し、壊れていれば型付きの ApiError を
 * 投げる。コンポーネント側でレスポンス型を手書きしない（旧 App.tsx の方式には戻さない）。
 * ルートローダは TanStack の流儀どおり、この throw をそのまま errorComponent に渡す。
 */

import type { z } from 'zod'
import {
  API_PATHS,
  type ApiErrorBody,
  ApiErrorSchema,
  EVENT_QUERY_DEFAULTS,
  type EventDetailResponse,
  EventDetailResponseSchema,
  type EventListResponse,
  EventListResponseSchema,
  type EventQuery,
  HealthResponseSchema,
  type SummaryResponse,
  SummaryResponseSchema,
} from '@/shared/api'

export class ApiError extends Error {
  readonly code: ApiErrorBody['error']['code']

  constructor(code: ApiErrorBody['error']['code'], message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

/**
 * URL に載せるキーは EVENT_QUERY_DEFAULTS から導出する。
 * 手で並べると、絞り込みを増やしたときにここへの追加を忘れて
 * 「UI では選べるのにサーバーに届かない」状態になる（実際に一度やった）。
 */
const EVENT_QUERY_KEYS = Object.keys(EVENT_QUERY_DEFAULTS).filter(
  (key): key is keyof EventQuery => key in EVENT_QUERY_DEFAULTS,
)

/** 既定値と同じ値は URL に載せない。フィルタ変更後の戻る/進むや共有 URL を短く保つため。 */
const buildEventSearchParams = (query: EventQuery): URLSearchParams => {
  const params = new URLSearchParams()
  for (const key of EVENT_QUERY_KEYS) {
    const value = query[key]
    if (value === EVENT_QUERY_DEFAULTS[key]) continue
    params.set(key, String(value))
  }
  return params
}

/**
 * fetch + safeParse + ApiError 化をここ 1 箇所に集める。
 * 不正なレスポンスの検出という設計意図を fetch ヘルパの境界に残す。
 */
const request = async <Schema extends z.ZodType>(
  path: string,
  schema: Schema,
): Promise<z.infer<Schema>> => {
  const response = await fetch(path)
  const body: unknown = await response.json()

  if (!response.ok) {
    const parsedError = ApiErrorSchema.safeParse(body)
    if (parsedError.success) {
      throw new ApiError(parsedError.data.error.code, parsedError.data.error.message)
    }
    throw new ApiError('internal', `API が ${response.status} を返しました`)
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw new ApiError('internal', 'API の応答を解釈できませんでした')
  }
  return parsed.data
}

export const fetchHealth = (): Promise<{ ok: boolean }> =>
  request(API_PATHS.health, HealthResponseSchema)

export const fetchSummary = (): Promise<SummaryResponse> =>
  request(API_PATHS.summary, SummaryResponseSchema)

export const fetchEvents = (query: EventQuery): Promise<EventListResponse> => {
  const search = buildEventSearchParams(query).toString()
  const path = search.length > 0 ? `${API_PATHS.events}?${search}` : API_PATHS.events
  return request(path, EventListResponseSchema)
}

export const fetchEvent = (id: number): Promise<EventDetailResponse> =>
  request(API_PATHS.event(id), EventDetailResponseSchema)
