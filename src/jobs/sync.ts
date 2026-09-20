import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import type { Bindings, Config } from '../config'
import { fetchEventsBetween, fetchUpcomingEvents } from '../ctftime/client'
import type { StoredEvent } from '../db/model'
import { toStoredEvent } from '../db/model'
import {
  claimNotification,
  countEvents,
  getOldestEventStart,
  listExistingEventIds,
  releaseNotification,
  setAnnounceMessageId,
  upsertEvents,
} from '../db/repository'
import { buildAnnouncePayload } from '../discord/embed'
import { postMessage } from '../discord/rest'

export type SyncResult = {
  fetched: number
  announced: number
  seeded: boolean
  backfilled: number
}

/** 告知対象にするかどうか。条件は wrangler.toml の [vars] で調整する。 */
const matchesAnnounceFilter = (event: StoredEvent, config: Config, nowIso: string): boolean => {
  // 既に始まった大会を「新着」として流しても読む側に意味がない。
  // 過去の取り込みで大量の終了済みイベントが新規扱いになったときの歯止めでもある。
  if (event.startAt <= nowIso) return false
  if (event.weight < config.announceMinWeight) return false
  if (event.onsite && !config.announceOnsite) return false
  if (
    config.announceRestrictions.length > 0 &&
    !config.announceRestrictions.includes(event.restrictions)
  ) {
    return false
  }
  if (config.announceFormats.length > 0 && !config.announceFormats.includes(event.format)) {
    return false
  }
  return true
}

/**
 * 過去のイベントを CTFTime から取り込む。アーカイブを最初から厚くするため。
 *
 * 通常の同期は「今〜lookaheadDays 日後に開始する」ものしか取らないので、
 * ボットが動き出す前に終わった大会は永久に入ってこない。
 *
 * 毎回は走らせない。過去 1 年ぶんは 400 件近くあり、15 分ごとに upsert すると
 * D1 の書き込み上限を無駄に食う。保有している最古のイベントが取り込み範囲の
 * 内側にしか無いときだけ実行するので、一度埋まれば以降は何もしない。
 * 取り込んだイベントは開始時刻が過去なので、告知ガードにより流れることはない。
 */
const backfillPastEvents = async (env: Bindings, config: Config, now: Dayjs): Promise<number> => {
  if (config.backfillDays === 0) return 0
  const from = now.subtract(config.backfillDays, 'day')

  const oldest = await getOldestEventStart(env.DB)
  // 1 日ぶんの余裕を見る。取り込み直後に境界付近で再実行されるのを避けるため。
  if (oldest !== null && oldest <= from.add(1, 'day').toISOString()) return 0

  const past = await fetchEventsBetween(from, now)
  if (past.length === 0) return 0
  await upsertEvents(env.DB, past.map(toStoredEvent), now)
  return past.length
}

/**
 * CTFTime を取得して D1 に反映し、新規登録されたイベントを告知する。
 *
 * 初回だけは events が空なので「全件が新規」に見えてしまう。
 * そのときは告知せず、通知済みとして記録するだけにする（シード）。
 */
export const syncEvents = async (env: Bindings, config: Config): Promise<SyncResult> => {
  const now = dayjs()
  const nowIso = now.toISOString()
  const events = await fetchUpcomingEvents(config.lookaheadDays)
  const stored = events.map(toStoredEvent)

  const knownCount = await countEvents(env.DB)
  const existingIds = await listExistingEventIds(
    env.DB,
    stored.map((event) => event.id),
  )
  await upsertEvents(env.DB, stored, now)

  const newcomers = stored.filter((event) => !existingIds.has(event.id))

  if (knownCount === 0) {
    for (const event of newcomers) {
      await claimNotification(env.DB, event.id, 'new', now)
    }
    await postMessage(config.botToken, config.channelId, {
      content: `CTFTime の初期同期が完了しました（${newcomers.length} 件）。これ以降に新しく登録されたイベントを告知します。`,
    })
    const backfilled = await backfillPastEvents(env, config, now)
    return { fetched: stored.length, announced: 0, seeded: true, backfilled }
  }

  const targets = newcomers.filter((event) => matchesAnnounceFilter(event, config, nowIso))
  const announced = await targets.reduce(async (previous, event) => {
    const count = await previous
    const claimed = await claimNotification(env.DB, event.id, 'new', now)
    if (!claimed) return count
    try {
      const messageId = await postMessage(
        config.botToken,
        config.channelId,
        buildAnnouncePayload(event, []),
      )
      await setAnnounceMessageId(env.DB, event.id, messageId)
      return count + 1
    } catch (error) {
      // 次回の cron で再試行できるよう、通知済みの記録を取り消す。
      await releaseNotification(env.DB, event.id, 'new')
      console.error(`イベント #${event.id} の告知に失敗しました`, error)
      return count
    }
  }, Promise.resolve(0))

  const backfilled = await backfillPastEvents(env, config, now)
  return { fetched: stored.length, announced, seeded: false, backfilled }
}
