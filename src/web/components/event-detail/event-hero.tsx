import { ExternalLinkIcon, MapPinIcon } from 'lucide-react'
import type { EventDetail } from '@/shared/api'
import { Badge } from '@/web/components/ui/badge'

type EventHeroProps = {
  event: EventDetail
}

/** オンライン / オンサイトの表記。Discord embed の formatVenue と同じ言い回しを踏襲する。 */
const venueLabel = (event: EventDetail): string => {
  if (!event.onsite) return 'オンライン'
  return event.location.length > 0 ? `オンサイト（${event.location}）` : 'オンサイト'
}

/**
 * ページ最上部。タイトルは Discord embed と同じく CTFTime へのリンクにする
 * （embed.ts の title/url と対応）。告知状況は隠さず、未告知ならその旨を明記する。
 */
export const EventHero = ({ event }: EventHeroProps) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
    {event.logo.length > 0 ? (
      <img
        src={event.logo}
        alt=""
        className="size-20 shrink-0 rounded-lg border object-cover"
        loading="lazy"
      />
    ) : null}
    <div className="min-w-0 flex-1 space-y-2">
      <p className="text-sm text-muted-foreground">#{event.id}</p>
      <h1 className="text-2xl font-semibold break-words sm:text-3xl">
        <a
          href={event.ctftimeUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 hover:underline"
        >
          {event.title}
          <ExternalLinkIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </a>
      </h1>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{event.format.length > 0 ? event.format : '形式不明'}</Badge>
        <Badge variant="outline">
          <MapPinIcon className="size-3" aria-hidden="true" />
          {venueLabel(event)}
        </Badge>
        <Badge variant="outline">Weight {event.weight.toFixed(2)}</Badge>
        {event.announced ? (
          <Badge className="bg-ai-positive text-ai-positive-foreground">Discord 告知済み</Badge>
        ) : (
          <Badge
            variant="secondary"
            title="weight・オンサイト・参加条件・形式のいずれかで告知フィルタに外れています。"
          >
            Discord 未告知
          </Badge>
        )}
      </div>
      {event.organizers.length > 0 ? (
        <p className="text-sm text-muted-foreground">主催: {event.organizers.join(', ')}</p>
      ) : null}
      <p className="text-sm">
        {event.url.length > 0 ? (
          <a
            href={event.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary underline underline-offset-4"
          >
            公式サイト
            <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
          </a>
        ) : (
          <span className="text-muted-foreground">公式サイト（未登録）</span>
        )}
      </p>
    </div>
  </div>
)
