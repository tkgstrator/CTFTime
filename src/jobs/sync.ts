import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import type { Bindings, Config } from '../config'
import { fetchEventsBetween, fetchSyncWindow } from '../ctftime/client'
import type { StoredEvent } from '../db/model'
import { toStoredEvent } from '../db/model'
import {
  claimNotification,
  countEvents,
  getOldestEventStart,
  getSyncState,
  listExistingEventIds,
  releaseNotification,
  setAnnounceMessageId,
  setSyncState,
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

/** 一括取り込みを何日ずつに割るか。1 リクエストあたりの件数と応答サイズを抑えるため。 */
const BACKFILL_CHUNK_DAYS = 365

/** 一括取り込みの完了を記録する sync_state のキー。値は完了時の backfillDays。 */
const BACKFILL_STATE_KEY = 'backfill_done_days'

/**
 * 過去のイベントを CTFTime から取り込む。アーカイブを最初から厚くするため。
 *
 * 通常の同期は「今〜lookaheadDays 日後に開始する」ものしか取らないので、
 * ボットが動き出す前に終わった大会は永久に入ってこない。
 *
 * 完了したら sync_state に印を置き、以降は何もしない。
 * 「最古が下限より古いか」で判定していたときは、CTFTime 自体の最古（2010-04-26）が
 * 下限に届かないため条件が永久に成立せず、端まで来たあとも 15 分ごとに
 * 同じ範囲を取り続けていた。印には指定日数を入れるので、範囲を広げたときだけ再開する。
 *
 * 取り込んだイベントは開始時刻が過去なので、告知ガードにより流れることはない。
 */
const backfillPastEvents = async (env: Bindings, config: Config, now: Dayjs): Promise<number> => {
  if (config.backfillDays === 0) return 0
  const doneFor = await getSyncState(env.DB, BACKFILL_STATE_KEY)
  if (doneFor === String(config.backfillDays)) return 0

  const from = now.subtract(config.backfillDays, 'day')
  const oldest = await getOldestEventStart(env.DB)

  // 1 回の実行で入れるのは 1 年ぶんだけ。全期間を一度にやると fetch と D1 の
  // batch が合わせて 150 回を超え、Workers のサブリクエスト上限に当たって落ちる。
  // 保有している最古の 1 つ手前を毎回埋めていくので、cron を重ねれば端まで届く。
  const to = oldest === null ? now : dayjs(oldest)
  const candidate = to.subtract(BACKFILL_CHUNK_DAYS, 'day')
  const chunkFrom = candidate.isBefore(from) ? from : candidate

  const past = await fetchEventsBetween(chunkFrom, to)
  const fresh = past.filter((event) => event.start < to.toISOString())
  // これより古いものが出てこなくなったら端に着いたとみなし、完了の印を置く。
  if (fresh.length === 0) {
    await setSyncState(env.DB, BACKFILL_STATE_KEY, String(config.backfillDays), now)
    return 0
  }
  await upsertEvents(
    env.DB,
    fresh.map((event) => toStoredEvent(event)),
    now,
  )
  return fresh.length
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
  const events = await fetchSyncWindow(config.lookaheadDays)
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
