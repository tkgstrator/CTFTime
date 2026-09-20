import dayjs from 'dayjs'
import { z } from 'zod'
import type { StoredEvent } from '../db/model'
import {
  addParticipant,
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

const UserSchema = z.object({ id: z.string().nonempty() })

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
const resolveUserId = (interaction: Interaction): string | null => {
  if (interaction.member !== undefined) return interaction.member.user.id
  if (interaction.user !== undefined) return interaction.user.id
  return null
}

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

const buildEventDetail = (event: StoredEvent, participantIds: string[]) => ({
  embeds: [buildEventEmbed(event, { stage: 'new', participantIds, withDescription: true })],
  components: buildJoinComponents(event),
})

const buildListResponse = (title: string, events: StoredEvent[], emptyHint: string) => {
  if (events.length === 0) return ephemeralText(emptyHint)
  return {
    type: ResponseType.MESSAGE,
    data: {
      embeds: [
        {
          title,
          color: 0x5865f2,
          description: events.map(formatEventLine).join('\n\n'),
        },
      ],
      flags: EPHEMERAL,
    },
  }
}

/** ボタン（参加する / 参加を取り消す）の処理。 */
const handleComponent = async (interaction: Interaction, db: D1Database) => {
  const customId = interaction.data?.custom_id
  const userId = resolveUserId(interaction)
  if (customId === undefined || userId === null) {
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
    await addParticipant(db, eventId, userId, now)
  } else if (action === 'leave') {
    await removeParticipant(db, eventId, userId)
  } else {
    return ephemeralText('未知の操作です。')
  }

  const participantIds = await listParticipantIds(db, eventId)
  return {
    type: ResponseType.UPDATE_MESSAGE,
    data: buildEventDetail(event, participantIds),
  }
}

/** /ctf のサブコマンド処理。 */
const handleCommand = async (interaction: Interaction, db: D1Database) => {
  const userId = resolveUserId(interaction)
  if (interaction.data?.name !== 'ctf' || userId === null) {
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
      `📅 今後 ${days} 日間の CTF`,
      events,
      `今後 ${days} 日間に開催予定のイベントは見つかりませんでした。`,
    )
  }

  if (sub.name === 'joined') {
    const events = await listJoinedEvents(db, userId, now)
    return buildListResponse(
      '✅ 参加表明したイベント',
      events,
      '参加表明したイベントはまだありません。告知の「参加する」を押すと登録されます。',
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
      data: { ...buildEventDetail(event, participantIds), flags: EPHEMERAL },
    }
  }

  return ephemeralText('未知のサブコマンドです。')
}

/** 署名検証済みのインタラクションを処理して、返す JSON を組み立てる。 */
export const handleInteraction = async (payload: unknown, db: D1Database) => {
  const parsed = InteractionSchema.safeParse(payload)
  if (!parsed.success) {
    return ephemeralText('インタラクションの形式を解釈できませんでした。')
  }
  const interaction = parsed.data

  if (interaction.type === InteractionType.PING) {
    return { type: ResponseType.PONG }
  }
  if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
    return handleComponent(interaction, db)
  }
  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    return handleCommand(interaction, db)
  }
  return ephemeralText('未対応のインタラクションです。')
}
