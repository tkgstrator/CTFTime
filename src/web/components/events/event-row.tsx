import { Link } from '@tanstack/react-router'
import { MapPinIcon } from 'lucide-react'
import type { EventSummary } from '@/shared/api'
import { AiPolicyBadge } from '@/web/components/common/ai-policy-badge'
import { EventTime } from '@/web/components/common/event-time'
import { Badge } from '@/web/components/ui/badge'
import { cn } from '@/web/lib/utils'
import { AnnouncementBadge } from './announcement-badge'

type EventRowProps = {
  event: EventSummary
  /** ホームの帯では密度を上げたいので要約文を省く。 */
  showSummary?: boolean
  className?: string
}

/**
 * 開催時間は日と時間に分けず、通しの時間数で出す。
 * CTF は「48 時間」「72 時間」のように時間で語られることが多く、
 * 「2日7時間」より「55時間」のほうが長さを比べやすい。
 */
const formatDuration = (days: number, hours: number): string => `${days * 24 + hours}時間`

/**
 * イベント 1 件ぶんの行。一覧ページとホームの帯の両方から使う共通の見せ方。
 *
 * 一度に多く見渡せることを優先して、ロゴを左に出して縦の積み上げを減らしている。
 * ロゴは行の高さを増やさずに大きくできるので、左に置くほど視認性と密度が両立する。
 *
 * 行のどこを押しても詳細へ飛ばしたいが、行の中には AI 判定バッジなど独自の
 * ホバーカードを持つ要素がある。a の入れ子は不正な HTML になるので、リンクは
 * タイトルの 1 本だけにして ::after で行全体を覆い、独自の操作を持つ要素だけを
 * z-10 で上に逃がしている。
 *
 * 左の線は border を常に透明で確保してから色を付ける。出たり消えたりで
 * 幅が変わると行が横にずれるため。
 *
 * 2 種類の参加者数（CTFTime 全体の登録チームと、この Discord サーバーでの参加表明）は
 * 別物なので、詰めた表示でもラベルは分けたまま残す。
 */
export const EventRow = ({ event, showSummary = true, className }: EventRowProps) => (
  <div
    className={cn(
      'group relative flex flex-wrap gap-x-3 gap-y-1 border-l-2 border-transparent py-3 pl-3',
      'transition-colors hover:border-primary focus-within:border-primary',
      className,
    )}
  >
    {/* ロゴが無いイベントもあるので、枠だけ残して本文の開始位置を行ごとに揃える。 */}
    {event.logo.length > 0 ? (
      <img
        src={event.logo}
        alt=""
        loading="lazy"
        className="mt-0.5 size-16 shrink-0 rounded object-contain"
      />
    ) : (
      <div className="mt-0.5 size-16 shrink-0" aria-hidden="true" />
    )}

    <div className="min-w-0 flex-1 basis-0 space-y-1">
      <h3 className="text-base leading-snug font-semibold">
        <Link
          to="/events/$eventId"
          params={{ eventId: String(event.id) }}
          className={cn(
            'after:absolute after:inset-0 group-hover:underline',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          )}
        >
          {event.title}
        </Link>
      </h3>

      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
        <EventTime iso={event.startAt} />
        <span className="text-muted-foreground">〜</span>
        <EventTime iso={event.finishAt} withCountdown={false} />
        <span className="text-xs text-muted-foreground">
          ({formatDuration(event.durationDays, event.durationHours)})
        </span>
        {event.onsite && event.location.length > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MapPinIcon className="size-3 shrink-0" aria-hidden="true" />
            {event.location}
          </span>
        ) : null}
      </div>

      {showSummary && event.summary.length > 0 ? (
        <p className="line-clamp-1 text-sm text-muted-foreground">{event.summary}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={event.onsite ? 'default' : 'outline'}>
          {event.onsite ? '現地開催' : 'オンライン'}
        </Badge>
        {event.format.length > 0 ? <Badge variant="secondary">{event.format}</Badge> : null}
        {event.restrictions.length > 0 ? (
          <Badge variant="secondary">{event.restrictions}</Badge>
        ) : null}
        {event.weight > 0 ? <Badge variant="outline">重み {event.weight}</Badge> : null}
        {/* 自前のホバーカードを持つので、行を覆うリンクより上に置く。 */}
        <span className="relative z-10">
          <AnnouncementBadge announced={event.announced} />
        </span>
        <AiPolicyBadge
          policy={event.aiPolicy}
          aiSnippets={event.aiSnippets}
          eventId={event.id}
          className="relative z-10"
        />
      </div>
    </div>

    {/*
      バッジの後ろに流すと折り返し位置しだいで行ごとにずれるので、固定幅の列にして縦に揃える。
      狭い画面では w-full で折り返り、行の下に回る。
      出すのは CTFTime の登録チーム数だけ。規模が分かるのはこちらで、
      Discord の参加表明数は詳細ページで見れば足りる。
    */}
    <div className="w-full shrink-0 sm:w-28 sm:text-right">
      <div className="text-sm font-medium tabular-nums">
        {event.ctftimeParticipants.toLocaleString('ja-JP')}
      </div>
      <div className="text-xs text-muted-foreground">参加チーム</div>
    </div>
  </div>
)
