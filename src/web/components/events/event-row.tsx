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

/** 「2日7時間」のような開催期間の短い表記。 */
const formatDuration = (days: number, hours: number): string => {
  if (days > 0 && hours > 0) return `${days}日${hours}時間`
  if (days > 0) return `${days}日`
  return `${hours}時間`
}

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
      'group relative flex gap-3 border-l-2 border-transparent py-3 pl-3',
      'transition-colors hover:border-primary focus-within:border-primary',
      className,
    )}
  >
    {event.logo.length > 0 ? (
      <img
        src={event.logo}
        alt=""
        loading="lazy"
        className="mt-0.5 size-16 shrink-0 rounded object-contain"
      />
    ) : null}

    <div className="min-w-0 flex-1 space-y-1">
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
        <span className="text-xs text-muted-foreground">
          CTFTime 登録 {event.ctftimeParticipants.toLocaleString('ja-JP')} チーム
        </span>
        <span className="text-xs text-muted-foreground">
          Discord 参加 {event.discordParticipants.toLocaleString('ja-JP')} 人
        </span>
      </div>
    </div>
  </div>
)
