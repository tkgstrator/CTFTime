import type { EventDetail } from '@/shared/api'
import { StatNumber } from '@/web/components/common/stat-number'

type ParticipationSectionProps = {
  event: EventDetail
}

/**
 * 参加条件と 2 種類の参加者数。
 *
 * ctftimeParticipants（CTFTime 全体の登録チーム数）と discordParticipants
 * （この Discord サーバーでの参加表明数）はまったく別の数字なので、
 * どちらも「参加者」とだけ書かず必ずラベルで区別する。
 */
export const ParticipationSection = ({ event }: ParticipationSectionProps) => (
  <div className="space-y-3">
    <h2 className="text-xl font-semibold">参加条件・登録数</h2>
    <p className="text-sm">{event.restrictions.length > 0 ? event.restrictions : '不明'}</p>
    <div className="grid grid-cols-2 gap-4">
      <StatNumber label="CTFTime 登録チーム" value={event.ctftimeParticipants} />
      <StatNumber label="Discord 参加表明" value={event.discordParticipants} />
    </div>
  </div>
)
