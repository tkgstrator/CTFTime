import dayjs from 'dayjs'
import type { Bindings, Config } from '../config'
import {
  claimNotification,
  listEventsForStage,
  listParticipantIds,
  type ReminderStage,
  releaseNotification,
} from '../db/repository'
import { buildReminderPayload } from '../discord/embed'
import { postMessage } from '../discord/rest'

/**
 * 早い段階から順に評価する。同じ cron で複数段階が当たることは通常ないが、
 * 当たった場合も「24時間前 → 開始」の順で届く方が読みやすい。
 */
const STAGES: ReminderStage[] = ['reminder_24h', 'reminder_1h', 'start', 'end']

export type RemindResult = { sent: number }

/** 参加表明済みのイベントについて、開催前後の通知を送る。 */
export const runReminders = async (env: Bindings, config: Config): Promise<RemindResult> => {
  const now = dayjs()

  const sent = await STAGES.reduce(async (previousStage, stage) => {
    const stageCount = await previousStage
    const events = await listEventsForStage(env.DB, stage, now)

    const counts = await events.reduce(async (previousEvent, event) => {
      const count = await previousEvent
      const participantIds = await listParticipantIds(env.DB, event.id)
      if (participantIds.length === 0) return count

      const claimed = await claimNotification(env.DB, event.id, stage, now)
      if (!claimed) return count

      try {
        await postMessage(
          config.botToken,
          config.channelId,
          buildReminderPayload(event, participantIds, stage),
        )
        return count + 1
      } catch (error) {
        await releaseNotification(env.DB, event.id, stage)
        console.error(`イベント #${event.id} の ${stage} 通知に失敗しました`, error)
        return count
      }
    }, Promise.resolve(0))

    return stageCount + counts
  }, Promise.resolve(0))

  return { sent }
}
