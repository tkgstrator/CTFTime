import dayjs, { type Dayjs } from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { Hono } from 'hono'
import type { Bindings } from '@/config'
import { listEventsForFeed } from '@/db/browse'
import type { StoredEvent } from '@/db/model'
import { EventQuerySchema } from '@/shared/api'
import { badRequestError } from './errors'

/**
 * db/model.ts も dayjs.extend(utc) しているが、こちらから import するのは
 * StoredEvent 型だけ（type-only import）なので、その副作用は届かない。
 * DTSTART/DTEND を UTC 表記で出すのに .utc() が要るので、ここで自分で登録する。
 */
dayjs.extend(utc)

export const calendarRoute = new Hono<{ Bindings: Bindings }>()

/** RFC 5545 の行折り返し。1 行 75 オクテット（UTF-8 バイト数）まで。 */
const FOLD_LIMIT = 75

/** value の先頭から maxBytes オクテット以内に収まる最大の文字数（マルチバイト文字を割らない）。 */
const maxCutLength = (value: string, maxBytes: number): number => {
  const encoder = new TextEncoder()
  const attempt = (length: number): number => {
    if (length <= 0) return 0
    return encoder.encode(value.slice(0, length)).length <= maxBytes ? length : attempt(length - 1)
  }
  return attempt(Math.min(value.length, maxBytes))
}

/** 1 つの content line を、継続行の先頭に半角スペースを足しながら折り返す。 */
const foldLine = (line: string): string => {
  const encoder = new TextEncoder()
  const step = (remaining: string, isFirst: boolean): string[] => {
    const budget = isFirst ? FOLD_LIMIT : FOLD_LIMIT - 1
    if (encoder.encode(remaining).length <= budget) {
      return [isFirst ? remaining : ` ${remaining}`]
    }
    const cut = maxCutLength(remaining, budget)
    const head = remaining.slice(0, cut)
    const tail = remaining.slice(cut)
    return [isFirst ? head : ` ${head}`, ...step(tail, false)]
  }
  return step(line, true).join('\r\n')
}

/**
 * RFC 5545 のテキストエスケープ。バックスラッシュを最初に処理しないと、
 * 後段で追加した `\,` `\;` `\n` のバックスラッシュまで二重にエスケープしてしまう。
 */
const escapeIcsText = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n/g, '\n')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')

const formatIcsDate = (iso: string): string => dayjs(iso).utc().format('YYYYMMDDTHHmmss[Z]')

const buildVevent = (event: StoredEvent, now: Dayjs): string[] => [
  'BEGIN:VEVENT',
  `UID:${event.id}@ctftime-bot`,
  `DTSTAMP:${formatIcsDate(now.toISOString())}`,
  `DTSTART:${formatIcsDate(event.startAt)}`,
  `DTEND:${formatIcsDate(event.finishAt)}`,
  `SUMMARY:${escapeIcsText(event.title)}`,
  `DESCRIPTION:${escapeIcsText(event.description)}`,
  `LOCATION:${escapeIcsText(event.location)}`,
  `URL:${escapeIcsText(event.ctftimeUrl)}`,
  'END:VEVENT',
]

const buildIcs = (events: StoredEvent[], now: Dayjs): string => {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ctftime-bot//events//JA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events.flatMap((event) => buildVevent(event, now)),
    'END:VCALENDAR',
  ]
  return `${lines.map(foldLine).join('\r\n')}\r\n`
}

const describeQueryIssues = (issues: readonly { path: PropertyKey[]; message: string }[]): string =>
  issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(' / ')

/**
 * カレンダー購読用の iCal フィード。フィルタは /api/events と同じクエリ組み立て
 * （buildEventQuery 経由）を再利用する。
 */
calendarRoute.get('/events.ics', async (c) => {
  const parsedQuery = EventQuerySchema.safeParse(c.req.query())
  if (!parsedQuery.success) {
    throw badRequestError(describeQueryIssues(parsedQuery.error.issues))
  }
  const now = dayjs()
  const events = await listEventsForFeed(c.env.DB, parsedQuery.data, now)
  const body = buildIcs(events, now)

  c.header('Cache-Control', 'public, max-age=60')
  c.header('Content-Type', 'text/calendar; charset=utf-8')
  return c.body(body)
})
