import {
  createFileRoute,
  type ErrorComponentProps,
  stripSearchParams,
} from '@tanstack/react-router'
import { FilterIcon } from 'lucide-react'
import { EVENT_QUERY_DEFAULTS, type EventQuery, EventQuerySchema } from '@/shared/api'
import { ErrorState } from '@/web/components/common/error-state'
import { PendingRow } from '@/web/components/common/pending-row'
import { EventFilters } from '@/web/components/events/event-filters'
import { EventList } from '@/web/components/events/event-list'
import { EventsPagination } from '@/web/components/events/events-pagination'
import { RangeTabs } from '@/web/components/events/range-tabs'
import { Button } from '@/web/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/web/components/ui/sheet'
import { fetchEvents, fetchSummary } from '@/web/lib/api'

/** 一覧の読み込み中プレースホルダの行数ぶんの固定キー（配列インデックスを key にしないため）。 */
const PENDING_ROW_KEYS = ['a', 'b', 'c', 'd', 'e', 'f'] as const

/**
 * 絞り込み・並べ替え・検索・ページングの一覧。状態はすべて URL に持つので、
 * フィルタ済みの状態そのものを Discord へリンクできる。
 *
 * facets（形式・参加制限の選択肢）は summary エンドポイントが持っているので、
 * イベント一覧と一緒に取得する。
 */
export const Route = createFileRoute('/events/')({
  validateSearch: EventQuerySchema,
  search: { middlewares: [stripSearchParams(EVENT_QUERY_DEFAULTS)] },
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [events, summary] = await Promise.all([fetchEvents(deps), fetchSummary()])
    return { events, facets: summary.facets }
  },
  staleTime: 60_000,
  pendingComponent: EventsPending,
  errorComponent: EventsError,
  component: EventsPage,
})

function EventsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { events, facets } = Route.useLoaderData()

  // フィルタが変わったら常にページを 1 へ戻す。ページ送り自体は EventsPagination が別に扱う。
  const updateFilters = (patch: Partial<Omit<EventQuery, 'page'>>) => {
    navigate({ search: (prev) => ({ ...prev, ...patch, page: 1 }) })
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">イベント一覧</h1>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="sm:hidden">
              <FilterIcon />
              絞り込み
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>絞り込み</SheetTitle>
            </SheetHeader>
            <EventFilters
              query={search}
              facets={facets}
              onChange={updateFilters}
              className="px-4 pb-4"
            />
          </SheetContent>
        </Sheet>
      </div>

      <RangeTabs
        value={search.range}
        onChange={(range) => updateFilters({ range })}
        className="mt-6"
      />

      <div className="mt-4 hidden sm:block">
        <EventFilters query={search} facets={facets} onChange={updateFilters} />
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        {events.total.toLocaleString('ja-JP')} 件中 {events.items.length} 件を表示
      </p>

      <EventList
        events={events.items}
        emptyTitle="条件に一致するイベントがありません"
        emptyDescription="絞り込みを変えて試してください。"
        className="mt-2"
      />

      <EventsPagination query={search} total={events.total} className="mt-8" />
    </section>
  )
}

function EventsPending() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-semibold">イベント一覧</h1>
      <div className="mt-6 divide-y divide-border">
        {PENDING_ROW_KEYS.map((key) => (
          <PendingRow key={key} />
        ))}
      </div>
    </section>
  )
}

function EventsError({ error }: ErrorComponentProps) {
  const message = error instanceof Error ? error.message : '不明なエラーです。'
  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-semibold">イベント一覧</h1>
      <ErrorState message={message} className="mt-6" />
    </section>
  )
}
