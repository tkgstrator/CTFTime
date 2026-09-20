import { Link } from '@tanstack/react-router'
import type { EventSummary } from '@/shared/api'
import { formatTime, isSameDay } from '@/shared/datetime'
import { cn } from '@/web/lib/utils'

type CalendarEventLinkProps = {
  event: EventSummary
  /** このマスが属する日。開始日・終了日だけ時刻を添える判断に使う。 */
  dayIso: string
  className?: string
}

/**
 * 日マスの中に置く 1 イベントぶんのリンク。複数日にまたがる開催がほとんどなので、
 * 開始日は開始時刻、終了日は終了時刻、それ以外の中日は時刻を出さず「継続中」だと分かる形にする。
 */
export const CalendarEventLink = ({ event, dayIso, className }: CalendarEventLinkProps) => {
  const isStartDay = isSameDay(event.startAt, dayIso)
  const isFinishDay = isSameDay(event.finishAt, dayIso)
  const time = isStartDay
    ? formatTime(event.startAt)
    : isFinishDay
      ? formatTime(event.finishAt)
      : ''

  return (
    <Link
      to="/events/$eventId"
      params={{ eventId: String(event.id) }}
      title={event.title}
      className={cn(
        'block truncate rounded bg-primary/10 px-1.5 py-0.5 text-left text-xs text-foreground hover:bg-primary/20',
        className,
      )}
    >
      {time.length > 0 ? <span className="tabular-nums text-muted-foreground">{time} </span> : null}
      {event.title}
    </Link>
  )
}
