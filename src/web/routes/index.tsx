import { createFileRoute, type ErrorComponentProps, Link } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { EVENT_QUERY_DEFAULTS, type EventQuery } from '@/shared/api'
import { formatLocal } from '@/shared/datetime'
import { ErrorState } from '@/web/components/common/error-state'
import { PendingRow } from '@/web/components/common/pending-row'
import { StatNumber } from '@/web/components/common/stat-number'
import { EventList } from '@/web/components/events/event-list'
import { buttonVariants } from '@/web/components/ui/button'
import { Separator } from '@/web/components/ui/separator'
import { fetchEvents, fetchSummary } from '@/web/lib/api'

/** 「これから 7 日」の窓の広さ。 */
const UPCOMING_WINDOW_DAYS = 7
const RUNNING_LIMIT = 6
const UPCOMING_LIMIT = 8
/** 「注目」は weight > 0 のものだけに絞りたいので、フィルタ後に十分残るよう広めに取る。 */
const FEATURED_POOL_SIZE = 20
const FEATURED_LIMIT = 5

/** 一覧の読み込み中プレースホルダの行数ぶんの固定キー（配列インデックスを key にしないため）。 */
const PENDING_ROW_KEYS = ['a', 'b', 'c'] as const

/**
 * ホーム — 開催中 / 直近 7 日 / 注目 + 全体カウンタ + 最終同期。
 *
 * Discord には「いま開催中」を横断して見る手段が無い（告知は流れて終わりで、
 * 一覧性が無い）。ここが唯一それを見せられる場所になる。
 */
export const Route = createFileRoute('/')({
  loader: async () => {
    const now = dayjs()
    const upcomingWindowEnd = now.add(UPCOMING_WINDOW_DAYS, 'day').toISOString()

    const [summary, running, upcoming, featuredPool] = await Promise.all([
      fetchSummary(),
      fetchEvents({
        ...EVENT_QUERY_DEFAULTS,
        range: 'running',
        sort: '-weight',
        perPage: RUNNING_LIMIT,
      }),
      fetchEvents({
        ...EVENT_QUERY_DEFAULTS,
        range: 'upcoming',
        sort: 'start',
        perPage: UPCOMING_LIMIT,
        to: upcomingWindowEnd,
      }),
      fetchEvents({
        ...EVENT_QUERY_DEFAULTS,
        range: 'upcoming',
        sort: '-weight',
        perPage: FEATURED_POOL_SIZE,
      }),
    ])

    return {
      summary,
      running: running.items,
      upcoming: upcoming.items,
      // weight = 0 が大半（ローカル 33 件中 18 件）なので、0 を含めると「注目」の体を成さない。
      featured: featuredPool.items.filter((event) => event.weight > 0).slice(0, FEATURED_LIMIT),
    }
  },
  staleTime: 60_000,
  pendingComponent: HomePending,
  errorComponent: HomeError,
  component: HomePage,
})

type SectionHeadingProps = {
  title: string
  moreSearch: Partial<EventQuery>
}

/** 各帯の見出しと「すべて見る」リンク。同じ絞り込み条件で /events に飛ばす。 */
const SectionHeading = ({ title, moreSearch }: SectionHeadingProps) => (
  <div className="flex items-center justify-between gap-4">
    <h2 className="text-xl font-semibold">{title}</h2>
    <Link
      to="/events"
      search={{ ...EVENT_QUERY_DEFAULTS, ...moreSearch }}
      className={buttonVariants({ variant: 'link', size: 'sm' })}
    >
      すべて見る
    </Link>
  </div>
)

function HomePage() {
  const { summary, running, upcoming, featured } = Route.useLoaderData()

  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-3xl font-semibold">ホーム</h1>
        <p className="text-sm text-muted-foreground">
          最終同期:{' '}
          {summary.lastSyncedAt === null
            ? 'まだ同期されていません'
            : formatLocal(summary.lastSyncedAt)}
        </p>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatNumber label="総イベント数" value={summary.totals.events} />
        <StatNumber label="開催中" value={summary.totals.running} />
        <StatNumber label="開催予定" value={summary.totals.upcoming} />
        <StatNumber label="Discord 告知済み" value={summary.totals.announced} />
      </div>

      <Separator className="my-8" />

      <SectionHeading title="いま開催中" moreSearch={{ range: 'running' }} />
      <EventList
        events={running}
        emptyTitle="現在開催中の CTF はありません"
        showSummary={false}
        className="mt-2"
      />

      <Separator className="my-8" />

      <SectionHeading title="これから 7 日" moreSearch={{ range: 'upcoming' }} />
      <EventList
        events={upcoming}
        emptyTitle="7 日以内に始まる CTF はありません"
        showSummary={false}
        className="mt-2"
      />

      <Separator className="my-8" />

      <SectionHeading title="注目" moreSearch={{ range: 'upcoming', sort: '-weight' }} />
      <EventList
        events={featured}
        emptyTitle="Weight が付いた開催予定の CTF はまだありません"
        emptyDescription="CTFTime 側で weight が確定すると表示されます。"
        showSummary={false}
        className="mt-2"
      />
    </section>
  )
}

function HomePending() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-semibold">ホーム</h1>
      <div className="mt-6 divide-y divide-border">
        {PENDING_ROW_KEYS.map((key) => (
          <PendingRow key={key} />
        ))}
      </div>
    </section>
  )
}

function HomeError({ error }: ErrorComponentProps) {
  const message = error instanceof Error ? error.message : '不明なエラーです。'
  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-semibold">ホーム</h1>
      <ErrorState message={message} className="mt-6" />
    </section>
  )
}
