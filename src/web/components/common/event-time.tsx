import { formatLocal, formatUtc } from '@/shared/datetime'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/web/components/ui/tooltip'
import { cn } from '@/web/lib/utils'
import { Countdown } from './countdown'

type EventTimeProps = {
  iso: string
  /** 相対表示（あと3日 等）を隣に添えるか。一覧の密な行では省略したいことがある。 */
  withCountdown?: boolean
  className?: string
}

/**
 * 日時 1 点の表示。ローカル時刻を主役にし、UTC はツールチップの裏付けとして添える。
 * Discord は <t:unix:F> で各自のローカル時刻に描画してくれるが、Web にはそれが無いので
 * ここで同じことを自前でやる。
 */
export const EventTime = ({ iso, withCountdown = true, className }: EventTimeProps) => (
  <span className={cn('inline-flex items-baseline gap-1.5', className)}>
    <Tooltip>
      <TooltipTrigger asChild>
        <time dateTime={iso} className="cursor-help underline decoration-dotted underline-offset-4">
          {formatLocal(iso)}
        </time>
      </TooltipTrigger>
      <TooltipContent>{formatUtc(iso)}</TooltipContent>
    </Tooltip>
    {withCountdown ? <Countdown targetIso={iso} className="text-xs text-muted-foreground" /> : null}
  </span>
)
