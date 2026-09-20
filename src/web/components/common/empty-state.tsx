import type { ReactNode } from 'react'
import { cn } from '@/web/lib/utils'

type EmptyStateProps = {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

/**
 * 「該当なし」を伝える共通の見せ方。参加者ゼロ・過去イベントゼロなど、
 * ローカルでは実データが無いまま出荷される空状態がこのサイトの最大のリスクなので、
 * 空であること自体を明確に伝える。
 */
export const EmptyState = ({ title, description, action, className }: EmptyStateProps) => (
  <div
    className={cn(
      'flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-12 text-center',
      className,
    )}
  >
    <p className="font-medium">{title}</p>
    {description !== undefined ? (
      <p className="text-sm text-muted-foreground">{description}</p>
    ) : null}
    {action !== undefined ? <div className="mt-2">{action}</div> : null}
  </div>
)
