import {
  AlarmClockIcon,
  FlagIcon,
  type LucideIcon,
  PlayIcon,
  SirenIcon,
  SparklesIcon,
} from 'lucide-react'
import type { NOTIFICATION_KINDS, Notification } from '@/shared/api'
import { formatLocal, formatUtc } from '@/shared/datetime'
import { EmptyState } from '@/web/components/common/empty-state'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/web/components/ui/tooltip'

type NotificationTimelineProps = {
  notifications: Notification[]
}

type KindDetail = { label: string; icon: LucideIcon }

/** Discord に実際に流れた通知の種類ごとの見せ方。 */
const KIND_DETAIL: Record<(typeof NOTIFICATION_KINDS)[number], KindDetail> = {
  new: { label: '新規登録', icon: SparklesIcon },
  reminder_24h: { label: '24時間前リマインダー', icon: AlarmClockIcon },
  reminder_1h: { label: '1時間前リマインダー', icon: SirenIcon },
  start: { label: '開始', icon: PlayIcon },
  end: { label: '終了', icon: FlagIcon },
}

/**
 * この Discord サーバーに実際に送られた通知の履歴。
 *
 * Discord の embed には現れない情報で、「24時間前リマインダーはもう送られたか」を
 * 読者が確認できるのはこのページだけ。sentAt の ISO 文字列は辞書順 = 時系列順なので
 * そのまま比較でソートできる。
 */
export const NotificationTimeline = ({ notifications }: NotificationTimelineProps) => {
  const sorted = [...notifications].sort((a, b) => (a.sentAt < b.sentAt ? -1 : 1))

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">通知履歴</h2>
      {sorted.length === 0 ? (
        <EmptyState title="まだ通知が送信されていません" />
      ) : (
        <ol className="space-y-3">
          {sorted.map((notification) => {
            const detail = KIND_DETAIL[notification.kind]
            const Icon = detail.icon
            return (
              <li
                key={`${notification.kind}-${notification.sentAt}`}
                className="flex items-center gap-3"
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="text-sm font-medium">{detail.label}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <time
                      dateTime={notification.sentAt}
                      className="cursor-help text-sm text-muted-foreground underline decoration-dotted underline-offset-4"
                    >
                      {formatLocal(notification.sentAt)}
                    </time>
                  </TooltipTrigger>
                  <TooltipContent>{formatUtc(notification.sentAt)}</TooltipContent>
                </Tooltip>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
