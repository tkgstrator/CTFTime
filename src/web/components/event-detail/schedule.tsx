import type { EventDetail } from '@/shared/api'
import { EventTime } from '@/web/components/common/event-time'

type ScheduleSectionProps = {
  event: EventDetail
}

/** embed.ts の formatDuration と同じ言い回し。両方 0 のときだけ「不明」にする。 */
const durationLabel = (event: EventDetail): string => {
  const days = event.durationDays > 0 ? `${event.durationDays}日` : ''
  const hours = event.durationHours > 0 ? `${event.durationHours}時間` : ''
  const label = `${days}${hours}`
  return label.length > 0 ? label : '不明'
}

/** Discord embed の「開催」フィールド相当。ローカル時刻を主役に、UTC はツールチップに置く。 */
export const ScheduleSection = ({ event }: ScheduleSectionProps) => (
  <div className="space-y-3">
    <h2 className="text-xl font-semibold">開催</h2>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">開始</p>
        <EventTime iso={event.startAt} />
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">終了</p>
        <EventTime iso={event.finishAt} withCountdown={false} />
      </div>
    </div>
    <p className="text-sm">
      期間 <span className="font-medium">{durationLabel(event)}</span>
    </p>
  </div>
)
