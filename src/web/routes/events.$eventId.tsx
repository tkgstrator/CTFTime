import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { z } from 'zod'
import { EVENT_QUERY_DEFAULTS } from '@/shared/api'
import { AiPolicySection } from '@/web/components/event-detail/ai-policy'
import { DescriptionSection } from '@/web/components/event-detail/description'
import { EventHero } from '@/web/components/event-detail/event-hero'
import { NotificationTimeline } from '@/web/components/event-detail/notification-timeline'
import { ParticipantList } from '@/web/components/event-detail/participant-list'
import { ParticipationSection } from '@/web/components/event-detail/participation'
import { PrizesSection } from '@/web/components/event-detail/prizes'
import { ScheduleSection } from '@/web/components/event-detail/schedule'
import { buttonVariants } from '@/web/components/ui/button'
import { Separator } from '@/web/components/ui/separator'
import { ApiError, fetchEvent } from '@/web/lib/api'

/** URL パラメータは文字列で来る。数値でなければ 404 と同じ扱いにする。 */
const eventIdSchema = z.coerce.number().int().positive()

/** Discord Embed 相当 + 通知履歴 + 参加表明者。GET /api/events/:id を叩く。 */
export const Route = createFileRoute('/events/$eventId')({
  // 読み取り専用サイトなので、1 分以内の再訪では取り直さない。
  staleTime: 60_000,
  loader: async ({ params }) => {
    const parsedId = eventIdSchema.safeParse(params.eventId)
    if (!parsedId.success) throw notFound()

    try {
      return await fetchEvent(parsedId.data)
    } catch (error) {
      if (error instanceof ApiError && error.code === 'not_found') throw notFound()
      throw error
    }
  },
  component: EventDetailPage,
  notFoundComponent: EventNotFound,
  errorComponent: EventDetailError,
})

function EventDetailPage() {
  const { event, participants, notifications } = Route.useLoaderData()

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <EventHero event={event} />
      <Separator className="my-8" />
      <ScheduleSection event={event} />
      <Separator className="my-8" />
      <ParticipationSection event={event} />
      <Separator className="my-8" />
      <PrizesSection prizes={event.prizes} />
      <Separator className="my-8" />
      <AiPolicySection policy={event.aiPolicy} snippets={event.aiSnippets} />
      <Separator className="my-8" />
      <ParticipantList participants={participants} />
      <Separator className="my-8" />
      <NotificationTimeline notifications={notifications} />
      <Separator className="my-8" />
      <DescriptionSection description={event.description} />
    </section>
  )
}

/**
 * 取得済みのイベントは削除しないので、404 になるのは同期の対象外だった id のとき。
 * ボットの運用開始前に終わった大会や、取得範囲より先の日程はそもそも入っていない。
 */
function EventNotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">イベントが見つかりませんでした</h1>
      <p className="text-muted-foreground">
        指定された ID のイベントは取得されていません。CTFTime から同期しているのは一定期間先までに
        開始する大会なので、範囲の外にあるものはこのサイトには入っていません。
      </p>
      <Link
        to="/events"
        search={EVENT_QUERY_DEFAULTS}
        className={buttonVariants({ variant: 'default' })}
      >
        イベント一覧を見る
      </Link>
    </div>
  )
}

function EventDetailError({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : '不明なエラーです。'
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="text-sm font-medium text-muted-foreground">エラー</p>
      <h1 className="text-2xl font-semibold text-destructive">読み込みに失敗しました</h1>
      <p className="text-muted-foreground">{message}</p>
      <Link
        to="/events"
        search={EVENT_QUERY_DEFAULTS}
        className={buttonVariants({ variant: 'default' })}
      >
        イベント一覧を見る
      </Link>
    </div>
  )
}
