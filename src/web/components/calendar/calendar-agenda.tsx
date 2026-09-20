import dayjs from 'dayjs'
import type { EventSummary } from '@/shared/api'
import { formatDate, monthGridDays, overlapsDay } from '@/shared/datetime'
import { EmptyState } from '@/web/components/common/empty-state'
import { CalendarEventLink } from './calendar-event-link'

type CalendarAgendaProps = {
  month: string
  events: EventSummary[]
}

/**
 * 390px 向けの日別リスト。7 列グリッドは列が潰れて成立しないので、
 * 当月の日を先頭から並べ、イベントが乗っている日だけを見せる。
 */
export const CalendarAgenda = ({ month, events }: CalendarAgendaProps) => {
  const daysInMonth = monthGridDays(month).filter((day) => dayjs(day).isSame(dayjs(month), 'month'))
  const entries = daysInMonth
    .map((day) => ({
      day,
      dayEvents: events.filter((event) => overlapsDay(event.startAt, event.finishAt, day)),
    }))
    .filter((entry) => entry.dayEvents.length > 0)

  if (entries.length === 0) {
    return (
      <EmptyState
        title="この月に開催予定のイベントはありません"
        description="月を切り替えるか、イベント一覧から探してください。"
        className="sm:hidden"
      />
    )
  }

  return (
    <ol className="flex flex-col gap-4 sm:hidden">
      {entries.map((entry) => (
        <li key={entry.day}>
          <p className="text-sm font-medium text-muted-foreground">{formatDate(entry.day)}</p>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {entry.dayEvents.map((event) => (
              <li key={event.id}>
                <CalendarEventLink event={event} dayIso={entry.day} className="text-sm" />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  )
}
