import type { EventDetail } from '@/shared/api'
import { StatNumber } from '@/web/components/common/stat-number'

type ParticipationSectionProps = {
  event: EventDetail
}

/**
 * 参加条件と CTFTime の登録チーム数。
 *
 * Discord の参加表明数はここでは出さない。人数だけ見ても分かることが無く、
 * 誰が出るのかは下の参加表明セクションに名前で並ぶ。
 */
export const ParticipationSection = ({ event }: ParticipationSectionProps) => (
  <div className="space-y-3">
    <h2 className="text-xl font-semibold">参加条件・登録数</h2>
    <p className="text-sm">{event.restrictions.length > 0 ? event.restrictions : '不明'}</p>
    <StatNumber label="CTFTime 登録チーム" value={event.ctftimeParticipants} />
  </div>
)
