import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { type AiPolicy, detectAiPolicy } from '../ctftime/ai-policy'
import type { CtftimeEvent } from '../ctftime/schema'

dayjs.extend(utc)

/** D1 に保存する形のイベント。時刻は UTC の ISO8601 に正規化してある。 */
export type StoredEvent = {
  id: number
  ctfId: number
  title: string
  url: string
  ctftimeUrl: string
  logo: string
  format: string
  restrictions: string
  onsite: boolean
  location: string
  weight: number
  participants: number
  startAt: string
  finishAt: string
  durationDays: number
  durationHours: number
  description: string
  organizers: string[]
  aiPolicy: AiPolicy
  aiSnippets: string[]
  announceMessageId: string | null
}

/**
 * 参加表明した人。表示名とアバターは Discord から受け取った時点のもので、
 * 古い行では空文字のことがある（0002 のマイグレーションより前に押された分）。
 */
export type Participant = {
  userId: string
  displayName: string
  avatarHash: string
}

/**
 * 文字列比較だけで前後関係を判定したいので、必ず UTC の ISO8601 に揃える。
 * CTFTime は `+00:00` 形式のオフセット付きで返してくる。
 */
export const toIsoUtc = (value: string): string => dayjs.utc(value).toISOString()

/** CTFTime のレスポンスを保存形式に変換し、ついでに AI 方針を推定する。 */
export const toStoredEvent = (event: CtftimeEvent): StoredEvent => {
  const ai = detectAiPolicy(event.description, event.prizes)
  return {
    id: event.id,
    ctfId: event.ctf_id,
    title: event.title,
    url: event.url,
    ctftimeUrl: event.ctftime_url,
    logo: event.logo,
    format: event.format,
    restrictions: event.restrictions,
    onsite: event.onsite,
    location: event.location,
    weight: event.weight,
    participants: event.participants,
    startAt: toIsoUtc(event.start),
    finishAt: toIsoUtc(event.finish),
    durationDays: event.duration.days,
    durationHours: event.duration.hours,
    description: event.description,
    organizers: event.organizers.map((organizer) => organizer.name),
    aiPolicy: ai.policy,
    aiSnippets: ai.snippets,
    announceMessageId: null,
  }
}
