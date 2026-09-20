import { createFileRoute, type ErrorComponentProps } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { z } from 'zod'
import { EVENT_QUERY_DEFAULTS, MAX_PER_PAGE } from '@/shared/api'
import { monthBounds } from '@/shared/datetime'
import { CalendarAgenda } from '@/web/components/calendar/calendar-agenda'
import { CalendarGrid } from '@/web/components/calendar/calendar-grid'
import { CalendarNav } from '@/web/components/calendar/calendar-nav'
import { ErrorState } from '@/web/components/common/error-state'
import { Skeleton } from '@/web/components/ui/skeleton'
import { fetchEvents } from '@/web/lib/api'

/** 今月の月初日。URL を手で編集されても、ここへ落ちれば画面は成立する。 */
const currentMonth = (): string => dayjs().startOf('month').format('YYYY-MM-DD')

const CalendarSearchSchema = z.object({
  month: z.iso.date().catch(() => currentMonth()),
})

/**
 * 月カレンダー。Discord の構造上そもそも表現できない一覧なので、これがこのページの存在理由になる。
 * GET /api/events を from/to（月グリッド全体をカバーする範囲）で叩く。range は絞らず 'all' —
 * カレンダーには「開催中」も「終了済み」も同じマスに乗る。
 */
export const Route = createFileRoute('/calendar')({
  validateSearch: CalendarSearchSchema,
  loaderDeps: ({ search }) => ({ month: search.month }),
  loader: async ({ deps }) => {
    const { from, to } = monthBounds(deps.month)
    return fetchEvents({
      ...EVENT_QUERY_DEFAULTS,
      range: 'all',
      perPage: MAX_PER_PAGE,
      from,
      to,
    })
  },
  staleTime: 60_000,
  pendingComponent: CalendarPending,
  errorComponent: CalendarError,
  component: CalendarPage,
})

function CalendarPage() {
  const { month } = Route.useSearch()
  const { items } = Route.useLoaderData()

  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <CalendarNav month={month} />
      <p className="mt-2 text-sm text-muted-foreground">
        複数日にまたがる開催は、開催期間中のすべての日のマスに表示されます。
      </p>
      <div className="mt-6">
        <CalendarGrid month={month} events={items} />
        <CalendarAgenda month={month} events={items} />
      </div>
    </section>
  )
}

const GRID_SKELETON_CELLS = Array.from({ length: 42 }, (_, index) => index)
const AGENDA_SKELETON_ROWS = Array.from({ length: 4 }, (_, index) => index)

function CalendarPending() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <Skeleton className="h-9 w-48" />
      <div className="mt-6 hidden overflow-hidden rounded-lg border sm:grid sm:grid-cols-7 sm:gap-px sm:bg-border">
        {GRID_SKELETON_CELLS.map((cell) => (
          <Skeleton key={cell} className="h-24 rounded-none sm:h-28" />
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:hidden">
        {AGENDA_SKELETON_ROWS.map((row) => (
          <Skeleton key={row} className="h-16 w-full" />
        ))}
      </div>
    </section>
  )
}

function CalendarError({ error }: ErrorComponentProps) {
  const message = error instanceof Error ? error.message : '不明なエラーです。'
  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <ErrorState title="カレンダーの読み込みに失敗しました" message={message} />
    </section>
  )
}
