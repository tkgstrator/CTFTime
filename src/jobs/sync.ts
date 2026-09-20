import dayjs from 'dayjs'
import type { Bindings, Config } from '../config'
import { fetchUpcomingEvents } from '../ctftime/client'
import type { StoredEvent } from '../db/model'
import { toStoredEvent } from '../db/model'
import {
  claimNotification,
  countEvents,
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
}

/** 告知対象にするかどうか。条件は wrangler.toml の [vars] で調整する。 */
const matchesAnnounceFilter = (event: StoredEvent, config: Config): boolean => {
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
 * CTFTime を取得して D1 に反映し、新規登録されたイベントを告知する。
 *
 * 初回だけは events が空なので「全件が新規」に見えてしまう。
 * そのときは告知せず、通知済みとして記録するだけにする（シード）。
 */
export const syncEvents = async (env: Bindings, config: Config): Promise<SyncResult> => {
  const now = dayjs()
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
    return { fetched: stored.length, announced: 0, seeded: true }
  }

  const targets = newcomers.filter((event) => matchesAnnounceFilter(event, config))
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

  return { fetched: stored.length, announced, seeded: false }
}
