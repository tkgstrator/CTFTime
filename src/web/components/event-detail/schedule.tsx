import type { EventDetail } from '@/shared/api'
import { EventTime } from '@/web/components/common/event-time'

type ScheduleSectionProps = {
  event: EventDetail
}

/**
 * 日と時間に分けず通しの時間数で出す。CTF は「48 時間」のように時間で語られるので、
 * そのほうが長さを比べやすい。両方 0 のときだけ「不明」。
 */
const durationLabel = (event: EventDetail): string => {
  const total = event.durationDays * 24 + event.durationHours
  return total > 0 ? `${total}時間` : '不明'
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
