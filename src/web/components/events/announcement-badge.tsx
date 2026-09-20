import { Link } from '@tanstack/react-router'
import { Badge } from '@/web/components/ui/badge'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/web/components/ui/hover-card'
import { cn } from '@/web/lib/utils'

type AnnouncementBadgeProps = {
  announced: boolean
  className?: string
}

/**
 * Discord への告知有無を示すバッジ。
 *
 * announced: false は「D1 には保存されているが weight / onsite / restrictions / format の
 * どれかのフィルタを通らず Discord には流れなかった」ことを意味する。Discord だけを見ている
 * 人には存在すら分からないイベントなので、隠さず目立たせることがこのサイトの存在理由の中核。
 */
export const AnnouncementBadge = ({ announced, className }: AnnouncementBadgeProps) => {
  if (announced) {
    return (
      <Badge variant="secondary" className={className}>
        Discord 告知済み
      </Badge>
    )
  }

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Badge variant="outline" className={cn('cursor-help border-dashed', className)}>
          Discord 未告知
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent className="space-y-2 text-sm">
        <p className="text-muted-foreground">
          Weight や開催形式・参加制限などの告知条件を満たさなかったため、Discord には流れていません。
        </p>
        <Link to="/about" className="text-primary underline underline-offset-4">
          告知条件を確認する
        </Link>
      </HoverCardContent>
    </HoverCard>
  )
}
