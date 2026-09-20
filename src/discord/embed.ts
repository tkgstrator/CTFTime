import dayjs from 'dayjs'
import { describeAiPolicy } from '../ctftime/ai-policy'
import type { StoredEvent } from '../db/model'
import type { ReminderStage } from '../db/repository'

/** 通知の段階ごとの色。左端のバーだけで何の通知か分かるようにする。 */
const COLOR = {
  new: 0x5865f2,
  reminder_24h: 0xfaa61a,
  reminder_1h: 0xf57731,
  start: 0x57f287,
  end: 0x95a5a6,
} as const

const STAGE_HEADLINE: Record<ReminderStage, string> = {
  reminder_24h: '**明日開催**',
  reminder_1h: '**まもなく開始（1時間以内）**',
  start: '**開始しました**',
  end: '**終了しました**',
}

const truncate = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max - 1)}…`

/** Discord のタイムスタンプ記法。閲覧者のローカル時刻で表示される。 */
const timestamp = (iso: string, style: 'F' | 'R' | 'f'): string =>
  `<t:${dayjs(iso).unix()}:${style}>`

/** 日と時間に分けず通しの時間数で出す。CTF は「48 時間」のように時間で語られるため。 */
const formatDuration = (event: StoredEvent): string => {
  const total = event.durationDays * 24 + event.durationHours
  return total > 0 ? `${total}時間` : '不明'
}

const formatVenue = (event: StoredEvent): string => {
  if (!event.onsite) return 'オンライン'
  return event.location.length > 0 ? `オンサイト（${event.location}）` : 'オンサイト'
}

/**
 * 参加表明の欄。人数を先頭に出しておくと、メンションを数えなくても規模が分かる。
 * 人数だけは必ず残したいので、切り詰めるのはメンション側。
 */
const formatParticipants = (userIds: string[]): string => {
  if (userIds.length === 0) return 'まだいません'
  const mentions = userIds.map((userId) => `<@${userId}>`).join(' ')
  return `**${userIds.length} 人**\n${truncate(mentions, 980)}`
}

/**
 * AI 利用可否のフィールド。推定ラベルの下に原文の抜粋を引用で置く。
 * 推定は外れることがあるので、原文を読んで判断できる形にしておく。
 */
const formatAiPolicy = (event: StoredEvent): string => {
  const label = describeAiPolicy(event.aiPolicy)
  if (event.aiSnippets.length === 0) {
    return `${label}\n-# description に AI 関連の記述が見つかりませんでした。公式ルールも確認してください。`
  }
  const quotes = event.aiSnippets.map((snippet) => `> ${truncate(snippet, 260)}`).join('\n')
  return truncate(`${label}\n${quotes}`, 1024)
}

/**
 * 参加登録ボタン。押した人ごとに状態が違うので、参加・取消の両方を常に出す。
 * （1 つのメッセージは全員に同じものが見えるため、状態でボタンを出し分けられない）
 */
export const buildJoinComponents = (event: StoredEvent) => [
  {
    type: 1,
    components: [
      { type: 2, style: 3, label: '参加する', custom_id: `join:${event.id}` },
      { type: 2, style: 2, label: '参加を取り消す', custom_id: `leave:${event.id}` },
      { type: 2, style: 5, label: 'CTFTime', url: event.ctftimeUrl },
    ],
  },
]

type EmbedOptions = {
  stage: keyof typeof COLOR
  participantIds: string[]
  withDescription: boolean
}

export const buildEventEmbed = (event: StoredEvent, options: EmbedOptions) => {
  const description = options.withDescription
    ? truncate(event.description.replace(/\r\n/g, '\n'), 400)
    : ''
  return {
    title: truncate(event.title, 250),
    url: event.ctftimeUrl,
    color: COLOR[options.stage],
    description: description.length > 0 ? description : undefined,
    thumbnail: event.logo.length > 0 ? { url: event.logo } : undefined,
    fields: [
      {
        name: '開催',
        value: `${timestamp(event.startAt, 'F')}\n〜 ${timestamp(event.finishAt, 'F')}\n開始 ${timestamp(event.startAt, 'R')}`,
        inline: false,
      },
      {
        name: '形式',
        value: `${event.format.length > 0 ? event.format : '不明'}・${formatVenue(event)}・${formatDuration(event)}`,
        inline: true,
      },
      {
        name: '参加条件',
        value: event.restrictions.length > 0 ? event.restrictions : '不明',
        inline: true,
      },
      {
        name: 'Weight / 登録数',
        value: `${event.weight.toFixed(2)} / ${event.participants} チーム`,
        inline: true,
      },
      { name: 'AI 利用', value: formatAiPolicy(event), inline: false },
      {
        name: '公式サイト',
        value: event.url.length > 0 ? event.url : '（未登録）',
        inline: false,
      },
      { name: '参加表明', value: formatParticipants(options.participantIds), inline: false },
    ],
    footer: {
      text:
        event.organizers.length > 0
          ? truncate(`主催: ${event.organizers.join(', ')}`, 2000)
          : `CTFTime event #${event.id}`,
    },
  }
}

/** 新規イベントの告知。参加ボタン付きでチャンネルに投げる。 */
export const buildAnnouncePayload = (event: StoredEvent, participantIds: string[]) => ({
  content: '🆕 **新しい CTF が登録されました**',
  embeds: [buildEventEmbed(event, { stage: 'new', participantIds, withDescription: true })],
  components: buildJoinComponents(event),
})

/** 参加表明済みの人に向けたリマインダ。メンションで確実に届かせる。 */
export const buildReminderPayload = (
  event: StoredEvent,
  participantIds: string[],
  stage: ReminderStage,
) => ({
  content: `${STAGE_HEADLINE[stage]}\n${participantIds.map((userId) => `<@${userId}>`).join(' ')}`,
  embeds: [buildEventEmbed(event, { stage, participantIds, withDescription: stage !== 'end' })],
  allowed_mentions: { users: participantIds },
})

/** 一覧表示用の 1 行。参加人数は 0 人なら出さない（並んだときに邪魔になるため）。 */
export const formatEventLine = (event: StoredEvent, participantCount?: number): string => {
  const ai = describeAiPolicy(event.aiPolicy)
  const count = participantCount === undefined ? 0 : participantCount
  const joined = count > 0 ? `・参加 ${count} 人` : ''
  return `**[${truncate(event.title, 60)}](${event.ctftimeUrl})**\n${timestamp(event.startAt, 'f')}（${timestamp(event.startAt, 'R')}）・${event.format}・${ai}${joined}\n\`/ctf info ${event.id}\``
}
