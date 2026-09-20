import dayjs from 'dayjs'
import { Hono } from 'hono'
import type { Bindings } from '@/config'
import { getSummary, toEventSummary } from '@/db/browse'
import type { SummaryResponse } from '@/shared/api'

export const summaryRoute = new Hono<{ Bindings: Bindings }>()

/**
 * 疎通確認用。`/` 以下は静的アセット（SPA）が返すので、Worker が生きているかは
 * こちらで見る。挙動は移設前と同じ。
 */
summaryRoute.get('/health', (c) => c.json({ ok: true }))

summaryRoute.get('/summary', async (c) => {
  const now = dayjs()
  const summary = await getSummary(c.env.DB, now)
  // 参加者数の集計を引かなくなったので、そのまま整形するだけでよい。
  const next = summary.next === null ? null : toEventSummary(summary.next)

  const body: SummaryResponse = {
    totals: summary.totals,
    lastSyncedAt: summary.lastSyncedAt,
    facets: summary.facets,
    next,
  }
  c.header('Cache-Control', 'public, max-age=60')
  return c.json(body)
})
