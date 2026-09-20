import type { EventSummary } from '@/shared/api'
import { EmptyState } from '@/web/components/common/empty-state'
import { cn } from '@/web/lib/utils'
import { EventRow } from './event-row'

type EventListProps = {
  events: EventSummary[]
  emptyTitle: string
  emptyDescription?: string
  showSummary?: boolean
  className?: string
}

/**
 * イベント行の一覧。枠で囲う代わりに、行の間をハイフン（divide-y）で区切って一覧性を出す。
 * 空状態はローカルデータの最大のリスク（参加者ゼロ・過去イベントゼロなど）なので、
 * 専用の EmptyState で明示する。
 */
export const EventList = ({
  events,
  emptyTitle,
  emptyDescription,
  showSummary = true,
  className,
}: EventListProps) => {
  if (events.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} className={className} />
  }

  return (
    <ul className={cn('divide-y divide-border', className)}>
      {events.map((event) => (
        <li key={event.id}>
          <EventRow event={event} showSummary={showSummary} />
        </li>
      ))}
    </ul>
  )
}
