import dayjs from 'dayjs'
import type { EventSummary } from '@/shared/api'
import { monthGridDays, overlapsDay } from '@/shared/datetime'
import { CalendarDayCell } from './calendar-day-cell'

type CalendarGridProps = {
  month: string
  events: EventSummary[]
}

/** 週の頭を日曜として並べる（dayjs ja ロケールの週開始に合わせる）。 */
const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

/**
 * 7 列の月グリッド。390px では列が潰れるため sm 以上でのみ表示し、
 * 狭い画面では CalendarAgenda に表示を譲る（同じ props から両方描画するので二重取得にはならない）。
 */
export const CalendarGrid = ({ month, events }: CalendarGridProps) => {
  const days = monthGridDays(month)
  const todayIso = dayjs().toISOString()

  return (
    <div className="hidden overflow-hidden rounded-lg border sm:grid sm:grid-cols-7 sm:gap-px sm:bg-border">
      {WEEKDAY_LABELS.map((label) => (
        <div
          key={label}
          className="bg-card px-2 py-1.5 text-center text-xs font-medium text-muted-foreground"
        >
          {label}
        </div>
      ))}
      {days.map((day) => (
        <CalendarDayCell
          key={day}
          dayIso={day}
          inMonth={dayjs(day).isSame(dayjs(month), 'month')}
          todayIso={todayIso}
          events={events.filter((event) => overlapsDay(event.startAt, event.finishAt, day))}
        />
      ))}
    </div>
  )
}
