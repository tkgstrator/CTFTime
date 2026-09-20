import { Hono } from 'hono'
import type { Bindings } from '@/config'
import type { ApiErrorBody } from '@/shared/api'
import { calendarRoute } from './calendar'
import { ApiError } from './errors'
import { eventsRoute } from './events'
import { summaryRoute } from './summary'

/**
 * /api 配下の全ルート。ここで使ってよいバインディングは c.env.DB だけ。
 *
 * parseConfig（src/config.ts）は Discord のシークレットが 1 つでも
 * 未設定だと例外を投げる。ボットの設定不備がそのまま公開サイトの 500 に
 * ならないよう、この層には絶対に parseConfig を持ち込まない
 * （後から「共通ミドルウェアに」と持ち上げないこと）。
 */
export const api = new Hono<{ Bindings: Bindings }>()

api.route('/', summaryRoute)
api.route('/', eventsRoute)
api.route('/', calendarRoute)

api.onError((err, c) => {
  if (err instanceof ApiError) {
    const body: ApiErrorBody = { error: { code: err.code, message: err.message } }
    return c.json(body, err.status)
  }
  console.error('/api で想定外のエラー', err)
  const body: ApiErrorBody = { error: { code: 'internal', message: '内部エラーが発生しました' } }
  return c.json(body, 500)
})

/** /api 配下だけの JSON 404。静的アセットへのフォールバックは呼び出し側（src/index.ts）の役目。 */
api.notFound((c) => {
  const body: ApiErrorBody = { error: { code: 'not_found', message: 'not found' } }
  return c.json(body, 404)
})
