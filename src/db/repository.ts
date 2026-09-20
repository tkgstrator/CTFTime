import type { Dayjs } from 'dayjs'
import { z } from 'zod'
import { AI_POLICY_VALUES } from '../ctftime/ai-policy'
import type { Participant, StoredEvent } from './model'

/** 通知の種類。events × kind で 1 回しか送らない。 */
export const NOTIFICATION_KINDS = ['new', 'reminder_24h', 'reminder_1h', 'start', 'end'] as const

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number]

/** 参加表明したイベントにだけ送るリマインダ。 */
export type ReminderStage = Exclude<NotificationKind, 'new'>

/** D1 の TEXT 列。保存時に正規化済みなので、読み出しでは空文字も許す。 */
const storedText = z.string().trim()

/** TEXT 列に JSON で入れた文字列配列。壊れていても通知自体は続けたいので空配列に倒す。 */
const jsonStringArray = z.string().transform((raw) => {
  const parsed = z.array(storedText).safeParse(JSON.parse(raw))
  return parsed.success ? parsed.data : []
})

const EventRowSchema = z
  .object({
    id: z.number().int(),
    ctf_id: z.number().int(),
    title: storedText,
    url: storedText,
    ctftime_url: storedText,
    logo: storedText,
    format: storedText,
    restrictions: storedText,
    onsite: z.number().int(),
    location: storedText,
    weight: z.number(),
    participants: z.number().int(),
    start_at: z.string().nonempty(),
    finish_at: z.string().nonempty(),
    duration_days: z.number().int(),
    duration_hours: z.number().int(),
    description: storedText,
    organizers: jsonStringArray,
    ai_policy: z.enum(AI_POLICY_VALUES).catch('unknown'),
    ai_snippets: jsonStringArray,
    announce_message_id: z.string().nonempty().nullable(),
  })
  .transform(
    (row): StoredEvent => ({
      id: row.id,
      ctfId: row.ctf_id,
      title: row.title,
      url: row.url,
      ctftimeUrl: row.ctftime_url,
      logo: row.logo,
      format: row.format,
      restrictions: row.restrictions,
      onsite: row.onsite === 1,
      location: row.location,
      weight: row.weight,
      participants: row.participants,
      startAt: row.start_at,
      finishAt: row.finish_at,
      durationDays: row.duration_days,
      durationHours: row.duration_hours,
      description: row.description,
      organizers: row.organizers,
      aiPolicy: row.ai_policy,
      aiSnippets: row.ai_snippets,
      announceMessageId: row.announce_message_id,
    }),
  )

const EventRowListSchema = z.array(EventRowSchema)

const toEvents = (results: unknown): StoredEvent[] => {
  const parsed = EventRowListSchema.safeParse(results)
  if (!parsed.success) {
    throw new Error(`events テーブルの行を読めませんでした: ${parsed.error.issues[0]?.message}`)
  }
  return parsed.data
}

const UPSERT_EVENT_SQL = `
INSERT INTO events (
  id, ctf_id, title, url, ctftime_url, logo, format, restrictions, onsite, location,
  weight, participants, start_at, finish_at, duration_days, duration_hours,
  description, organizers, ai_policy, ai_snippets, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  title = excluded.title,
  url = excluded.url,
  ctftime_url = excluded.ctftime_url,
  logo = excluded.logo,
  format = excluded.format,
  restrictions = excluded.restrictions,
  onsite = excluded.onsite,
  location = excluded.location,
  weight = excluded.weight,
  participants = excluded.participants,
  start_at = excluded.start_at,
  finish_at = excluded.finish_at,
  duration_days = excluded.duration_days,
  duration_hours = excluded.duration_hours,
  description = excluded.description,
  organizers = excluded.organizers,
  ai_policy = excluded.ai_policy,
  ai_snippets = excluded.ai_snippets,
  updated_at = excluded.updated_at
`

/** D1 の 1 バッチあたりの文数。大きすぎると制限に当たるので控えめにする。 */
const BATCH_SIZE = 20

const chunk = <T>(items: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_unused, index) =>
    items.slice(index * size, (index + 1) * size),
  )

/** 既に events に入っている id を返す。新規判定に使う。 */
export const listExistingEventIds = async (db: D1Database, ids: number[]): Promise<Set<number>> => {
  if (ids.length === 0) return new Set<number>()
  const placeholders = ids.map(() => '?').join(', ')
  const { results } = await db
    .prepare(`SELECT id FROM events WHERE id IN (${placeholders})`)
    .bind(...ids)
    .all()
  const parsed = z.array(z.object({ id: z.number().int() })).safeParse(results)
  if (!parsed.success) return new Set<number>()
  return new Set(parsed.data.map((row) => row.id))
}

export const upsertEvents = async (
  db: D1Database,
  events: StoredEvent[],
  now: Dayjs,
): Promise<void> => {
  const timestamp = now.toISOString()
  const statements = events.map((event) =>
    db
      .prepare(UPSERT_EVENT_SQL)
      .bind(
        event.id,
        event.ctfId,
        event.title,
        event.url,
        event.ctftimeUrl,
        event.logo,
        event.format,
        event.restrictions,
        event.onsite ? 1 : 0,
        event.location,
        event.weight,
        event.participants,
        event.startAt,
        event.finishAt,
        event.durationDays,
        event.durationHours,
        event.description,
        JSON.stringify(event.organizers),
        event.aiPolicy,
        JSON.stringify(event.aiSnippets),
        timestamp,
        timestamp,
      ),
  )
  for (const group of chunk(statements, BATCH_SIZE)) {
    await db.batch(group)
  }
}

/** 取り込み済みイベント数。初回同期かどうかの判定に使う。 */
export const countEvents = async (db: D1Database): Promise<number> => {
  const { results } = await db.prepare('SELECT COUNT(*) AS count FROM events').all()
  const parsed = z.array(z.object({ count: z.number().int() })).safeParse(results)
  if (!parsed.success) return 0
  const row = parsed.data[0]
  return row === undefined ? 0 : row.count
}

export const getEvent = async (db: D1Database, eventId: number): Promise<StoredEvent | null> => {
  const { results } = await db.prepare('SELECT * FROM events WHERE id = ?').bind(eventId).all()
  const events = toEvents(results)
  const event = events[0]
  return event === undefined ? null : event
}

export const setAnnounceMessageId = async (
  db: D1Database,
  eventId: number,
  messageId: string,
): Promise<void> => {
  await db
    .prepare('UPDATE events SET announce_message_id = ? WHERE id = ?')
    .bind(messageId, eventId)
    .run()
}

/**
 * 通知済みとして記録する。既に記録があれば false を返す。
 * INSERT の結果で判定するので、同時に 2 回走っても二重送信にならない。
 */
export const claimNotification = async (
  db: D1Database,
  eventId: number,
  kind: NotificationKind,
  now: Dayjs,
): Promise<boolean> => {
  const result = await db
    .prepare('INSERT OR IGNORE INTO notifications (event_id, kind, sent_at) VALUES (?, ?, ?)')
    .bind(eventId, kind, now.toISOString())
    .run()
  return result.meta.changes > 0
}

/** 通知の記録を取り消す。送信に失敗したときに呼ぶ。 */
export const releaseNotification = async (
  db: D1Database,
  eventId: number,
  kind: NotificationKind,
): Promise<void> => {
  await db
    .prepare('DELETE FROM notifications WHERE event_id = ? AND kind = ?')
    .bind(eventId, kind)
    .run()
}

type StageWindow = { clause: string; params: string[] }

/**
 * 段階ごとの発火条件。cron は 15 分おきなので、取りこぼしを避けて
 * 窓は cron 間隔よりかなり広く取る。二重送信は notifications 側で防ぐ。
 */
const stageWindow = (stage: ReminderStage, now: Dayjs): StageWindow => {
  const nowIso = now.toISOString()
  if (stage === 'reminder_24h') {
    return {
      clause: 'e.start_at > ? AND e.start_at <= ?',
      params: [now.add(22, 'hour').toISOString(), now.add(24, 'hour').toISOString()],
    }
  }
  if (stage === 'reminder_1h') {
    return {
      clause: 'e.start_at > ? AND e.start_at <= ?',
      params: [now.add(30, 'minute').toISOString(), now.add(1, 'hour').toISOString()],
    }
  }
  if (stage === 'start') {
    return { clause: 'e.start_at <= ? AND e.finish_at > ?', params: [nowIso, nowIso] }
  }
  return {
    clause: 'e.finish_at <= ? AND e.finish_at > ?',
    params: [nowIso, now.subtract(1, 'day').toISOString()],
  }
}

/** 参加表明があり、その段階の通知がまだ送られていないイベントを返す。 */
export const listEventsForStage = async (
  db: D1Database,
  stage: ReminderStage,
  now: Dayjs,
): Promise<StoredEvent[]> => {
  const window = stageWindow(stage, now)
  const { results } = await db
    .prepare(`
      SELECT e.* FROM events e
      WHERE EXISTS (SELECT 1 FROM participants p WHERE p.event_id = e.id)
        AND NOT EXISTS (
          SELECT 1 FROM notifications n WHERE n.event_id = e.id AND n.kind = ?
        )
        AND ${window.clause}
      ORDER BY e.start_at ASC
    `)
    .bind(stage, ...window.params)
    .all()
  return toEvents(results)
}

/**
 * 参加表明を登録する。すでに表明済みなら joined_at は保ったまま
 * 表示名とアバターだけ最新にする（改名やアイコン変更に追従させるため）。
 */
export const addParticipant = async (
  db: D1Database,
  eventId: number,
  participant: Participant,
  now: Dayjs,
): Promise<void> => {
  await db
    .prepare(`
      INSERT INTO participants (event_id, user_id, joined_at, display_name, avatar_hash)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(event_id, user_id) DO UPDATE SET
        display_name = excluded.display_name,
        avatar_hash = excluded.avatar_hash
    `)
    .bind(
      eventId,
      participant.userId,
      now.toISOString(),
      participant.displayName,
      participant.avatarHash,
    )
    .run()
}

export const removeParticipant = async (
  db: D1Database,
  eventId: number,
  userId: string,
): Promise<void> => {
  await db
    .prepare('DELETE FROM participants WHERE event_id = ? AND user_id = ?')
    .bind(eventId, userId)
    .run()
}

export const listParticipantIds = async (db: D1Database, eventId: number): Promise<string[]> => {
  const { results } = await db
    .prepare('SELECT user_id FROM participants WHERE event_id = ? ORDER BY joined_at ASC')
    .bind(eventId)
    .all()
  const parsed = z.array(z.object({ user_id: z.string().nonempty() })).safeParse(results)
  if (!parsed.success) return []
  return parsed.data.map((row) => row.user_id)
}

const ParticipantRowSchema = z.object({
  user_id: z.string().nonempty(),
  display_name: storedText,
  avatar_hash: storedText,
})

/** 参加表明した人を、表示名とアバターつきで取り出す。Web UI 用。 */
export const listParticipants = async (db: D1Database, eventId: number): Promise<Participant[]> => {
  const { results } = await db
    .prepare(`
      SELECT user_id, display_name, avatar_hash FROM participants
      WHERE event_id = ? ORDER BY joined_at ASC
    `)
    .bind(eventId)
    .all()
  const parsed = z.array(ParticipantRowSchema).safeParse(results)
  if (!parsed.success) return []
  return parsed.data.map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    avatarHash: row.avatar_hash,
  }))
}

/**
 * イベントごとの参加人数をまとめて数える。
 * 一覧画面でイベントの数だけクエリを投げずに済ませるため。
 */
export const countParticipantsByEvent = async (
  db: D1Database,
  eventIds: number[],
): Promise<Map<number, number>> => {
  if (eventIds.length === 0) return new Map<number, number>()
  const placeholders = eventIds.map(() => '?').join(', ')
  const { results } = await db
    .prepare(`
      SELECT event_id, COUNT(*) AS count FROM participants
      WHERE event_id IN (${placeholders})
      GROUP BY event_id
    `)
    .bind(...eventIds)
    .all()
  const parsed = z
    .array(z.object({ event_id: z.number().int(), count: z.number().int() }))
    .safeParse(results)
  if (!parsed.success) return new Map<number, number>()
  return new Map(parsed.data.map((row) => [row.event_id, row.count]))
}

/** そのユーザが参加表明していて、まだ終わっていないイベント。 */
export const listJoinedEvents = async (
  db: D1Database,
  userId: string,
  now: Dayjs,
): Promise<StoredEvent[]> => {
  const { results } = await db
    .prepare(`
      SELECT e.* FROM events e
      JOIN participants p ON p.event_id = e.id
      WHERE p.user_id = ? AND e.finish_at > ?
      ORDER BY e.start_at ASC
    `)
    .bind(userId, now.toISOString())
    .all()
  return toEvents(results)
}

/** これから始まるイベント。/ctf upcoming 用。 */
export const listUpcomingEvents = async (
  db: D1Database,
  now: Dayjs,
  days: number,
  limit: number,
): Promise<StoredEvent[]> => {
  const { results } = await db
    .prepare(`
      SELECT * FROM events
      WHERE finish_at > ? AND start_at <= ?
      ORDER BY start_at ASC
      LIMIT ?
    `)
    .bind(now.toISOString(), now.add(days, 'day').toISOString(), limit)
    .all()
  return toEvents(results)
}

/** 終了から 30 日経ったイベントを捨てる。参加表明と通知履歴も連鎖して消える。 */
export const purgeStaleEvents = async (db: D1Database, now: Dayjs): Promise<void> => {
  await db
    .prepare('DELETE FROM events WHERE finish_at < ?')
    .bind(now.subtract(30, 'day').toISOString())
    .run()
}
