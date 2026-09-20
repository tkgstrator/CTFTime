import dayjs from 'dayjs'
import type { EventSummary } from '@/shared/api'
import { isSameDay } from '@/shared/datetime'
import { cn } from '@/web/lib/utils'
import { CalendarEventLink } from './calendar-event-link'

type CalendarDayCellProps = {
  dayIso: string
  events: EventSummary[]
  /** グリッド外周の前月・翌月の日。淡く表示して当月と区別する。 */
  inMonth: boolean
  todayIso: string
}

/** 1 マスに収まる件数。超えた分は「+N」で件数だけ伝える（マスの高さが崩れないように）。 */
const VISIBLE_LIMIT = 3

export const CalendarDayCell = ({ dayIso, events, inMonth, todayIso }: CalendarDayCellProps) => {
  const isToday = isSameDay(dayIso, todayIso)
  const visible = events.slice(0, VISIBLE_LIMIT)
  const hiddenCount = events.length - visible.length

  return (
    <div
      className={cn(
        'flex min-h-24 flex-col gap-1 bg-card p-1.5 sm:min-h-28 sm:p-2',
        inMonth ? undefined : 'bg-muted/40 text-muted-foreground',
      )}
    >
      <span
        className={cn(
          'inline-flex size-6 items-center justify-center rounded-full text-xs font-medium',
          isToday ? 'bg-primary text-primary-foreground' : undefined,
        )}
      >
        {dayjs(dayIso).format('D')}
      </span>
      <div className="flex flex-col gap-1">
        {visible.map((event) => (
          <CalendarEventLink key={event.id} event={event} dayIso={dayIso} />
        ))}
        {hiddenCount > 0 ? (
          <span className="px-1.5 text-xs text-muted-foreground">他 {hiddenCount} 件</span>
        ) : null}
      </div>
    </div>
  )
}
