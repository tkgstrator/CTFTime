import dayjs from 'dayjs'
import { z } from 'zod'
import type { Participant, StoredEvent } from '../db/model'
import {
  addParticipant,
  countParticipantsByEvent,
  getEvent,
  listJoinedEvents,
  listParticipantIds,
  listUpcomingEvents,
  removeParticipant,
} from '../db/repository'
import { buildEventEmbed, buildJoinComponents, formatEventLine } from './embed'

const InteractionType = { PING: 1, APPLICATION_COMMAND: 2, MESSAGE_COMPONENT: 3 } as const

const ResponseType = { PONG: 1, MESSAGE: 4, UPDATE_MESSAGE: 7 } as const

/** 本人にだけ見えるメッセージ。一覧や操作結果はチャンネルを汚さないようにする。 */
const EPHEMERAL = 64

/** 一覧で出す最大件数。Discord の埋め込み文字数上限に収まる範囲。 */
const LIST_LIMIT = 10

/** Discord は未設定の項目を null で返すことがあるので、空文字に倒して受ける。 */
const optionalText = z.string().trim().catch('')

const UserSchema = z.object({
  id: z.string().nonempty(),
  username: optionalText,
  global_name: optionalText,
  avatar: optionalText,
})

const OptionValueSchema = z.union([z.string().trim(), z.number(), z.boolean()])

const SubOptionSchema = z.object({
  name: z.string().nonempty(),
  value: OptionValueSchema.optional(),
})

const OptionSchema = z.object({
  name: z.string().nonempty(),
  value: OptionValueSchema.optional(),
  options: z.array(SubOptionSchema).default([]),
})

export const InteractionSchema = z.object({
  type: z.number().int(),
  data: z
    .object({
      name: z.string().nonempty().optional(),
      custom_id: z.string().nonempty().optional(),
      options: z.array(OptionSchema).default([]),
    })
    .optional(),
  member: z.object({ user: UserSchema }).optional(),
  user: UserSchema.optional(),
})

export type Interaction = z.infer<typeof InteractionSchema>

/** ギルド内なら member.user、DM なら user に入る。 */
const resolveUser = (interaction: Interaction): z.infer<typeof UserSchema> | null => {
  if (interaction.member !== undefined) return interaction.member.user
  if (interaction.user !== undefined) return interaction.user
  return null
}

/**
 * 参加表明の保存に使う形へ。表示名は global_name（表示用の名前）を優先し、
 * 無ければ username に落とす。どちらも取れなければ空のままにして、
 * 表示側でユーザ ID を使わせる。
 */
const toParticipant = (user: z.infer<typeof UserSchema>): Participant => ({
  userId: user.id,
  displayName: user.global_name.length > 0 ? user.global_name : user.username,
  avatarHash: user.avatar,
})

const ephemeralText = (content: string) => ({
  type: ResponseType.MESSAGE,
  data: { content, flags: EPHEMERAL },
})

const numberOption = (options: SubOption[], name: string): number | null => {
  const option = options.find((item) => item.name === name)
  if (option === undefined) return null
  return typeof option.value === 'number' ? option.value : null
}

type SubOption = z.infer<typeof SubOptionSchema>

const buildEventDetail = (event: StoredEvent, participantIds: string[], siteUrl: string) => ({
  embeds: [buildEventEmbed(event, { stage: 'new', participantIds, withDescription: true })],
  components: buildJoinComponents(event, siteUrl),
})

const buildListResponse = (
  title: string,
  events: StoredEvent[],
  counts: Map<number, number>,
  emptyHint: string,
  siteUrl: string,
) => {
  if (events.length === 0) return ephemeralText(emptyHint)
  return {
    type: ResponseType.MESSAGE,
    data: {
      embeds: [
        {
          title,
          color: 0x5865f2,
          description: events
            .map((event) => formatEventLine(event, siteUrl, counts.get(event.id)))
            .join('\n\n'),
        },
      ],
      flags: EPHEMERAL,
    },
  }
}

/** 一覧に出すイベントの参加人数をまとめて引く。 */
const countsFor = (db: D1Database, events: StoredEvent[]): Promise<Map<number, number>> =>
  countParticipantsByEvent(
    db,
    events.map((event) => event.id),
  )

/** ボタン（参加する / 参加を取り消す）の処理。 */
const handleComponent = async (interaction: Interaction, db: D1Database, siteUrl: string) => {
  const customId = interaction.data?.custom_id
  const user = resolveUser(interaction)
  if (customId === undefined || user === null) {
    return ephemeralText('操作を受け取れませんでした。')
  }

  const [action, rawEventId] = customId.split(':')
  const eventId = Number(rawEventId)
  if (!Number.isInteger(eventId)) {
    return ephemeralText('ボタンの情報が壊れています。')
  }

  const event = await getEvent(db, eventId)
  if (event === null) {
    return ephemeralText('このイベントは既に削除されています。')
  }

  const now = dayjs()
  if (action === 'join') {
    await addParticipant(db, eventId, toParticipant(user), now)
  } else if (action === 'leave') {
    await removeParticipant(db, eventId, user.id)
  } else {
    return ephemeralText('未知の操作です。')
  }

  const participantIds = await listParticipantIds(db, eventId)
  return {
    type: ResponseType.UPDATE_MESSAGE,
    data: buildEventDetail(event, participantIds, siteUrl),
  }
}

/** /ctf のサブコマンド処理。 */
const handleCommand = async (interaction: Interaction, db: D1Database, siteUrl: string) => {
  const user = resolveUser(interaction)
  if (interaction.data?.name !== 'ctf' || user === null) {
    return ephemeralText('未知のコマンドです。')
  }

  const sub = interaction.data.options[0]
  if (sub === undefined) {
    return ephemeralText('サブコマンドを指定してください。')
  }

  const now = dayjs()

  if (sub.name === 'upcoming') {
    const requestedDays = numberOption(sub.options, 'days')
    const days = requestedDays === null ? 14 : requestedDays
    const events = await listUpcomingEvents(db, now, days, LIST_LIMIT)
    return buildListResponse(
      `今後 ${days} 日間の CTF`,
      events,
      await countsFor(db, events),
      `今後 ${days} 日間に開催予定のイベントは見つかりませんでした。`,
      siteUrl,
    )
  }

  if (sub.name === 'joined') {
    const events = await listJoinedEvents(db, user.id, now)
    return buildListResponse(
      '参加表明したイベント',
      events,
      await countsFor(db, events),
      '参加表明したイベントはまだありません。告知の「参加する」を押すと登録されます。',
      siteUrl,
    )
  }

  if (sub.name === 'info') {
    const eventId = numberOption(sub.options, 'event_id')
    if (eventId === null) {
      return ephemeralText('イベント id を指定してください。')
    }
    const event = await getEvent(db, eventId)
    if (event === null) {
      return ephemeralText(`イベント #${eventId} は取得済みの一覧にありません。`)
    }
    const participantIds = await listParticipantIds(db, eventId)
    return {
      type: ResponseType.MESSAGE,
      data: { ...buildEventDetail(event, participantIds, siteUrl), flags: EPHEMERAL },
    }
  }

  return ephemeralText('未知のサブコマンドです。')
}

/** 署名検証済みのインタラクションを処理して、返す JSON を組み立てる。 */
export const handleInteraction = async (payload: unknown, db: D1Database, siteUrl: string) => {
  const parsed = InteractionSchema.safeParse(payload)
  if (!parsed.success) {
    return ephemeralText('インタラクションの形式を解釈できませんでした。')
  }
  const interaction = parsed.data

  if (interaction.type === InteractionType.PING) {
    return { type: ResponseType.PONG }
  }
  if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
    return handleComponent(interaction, db, siteUrl)
  }
  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    return handleCommand(interaction, db, siteUrl)
  }
  return ephemeralText('未対応のインタラクションです。')
}
